// Key changes:
// - match_result_id → match_id
// - expires_at → response_deadline
// - offering_hospital_id and receiving_hospital_id are required
// - accept_offer(offer_id, user_id, surgeon_name) — matches the actual SP signature

const pool = require('../config/db');
const { broadcast } = require('../websocket/notifier');

// POST /api/offers
const sendOffer = async (req, res) => {
  const { match_id, expiry_minutes = 60 } = req.body;

  if (!match_id) return res.status(400).json({ error: 'match_id is required.' });

  try {
    const [matchRows] = await pool.query(
      `SELECT mr.match_id, mr.organ_id, mr.recipient_id,
              mr.donor_hospital_id, mr.recipient_hospital_id
       FROM match_results mr
       WHERE mr.match_id = ? AND mr.status = 'pending'`,
      [match_id]
    );
    if (matchRows.length === 0) {
      return res.status(404).json({ error: 'Match result not found or no longer pending.' });
    }

    const match = matchRows[0];
    const responseDeadline = new Date(Date.now() + expiry_minutes * 60 * 1000);

    const [result] = await pool.query(
      `INSERT INTO offers
        (match_id, organ_id, recipient_id,
         offering_hospital_id, receiving_hospital_id,
         offered_by, response_deadline, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [match_id, match.organ_id, match.recipient_id,
       match.donor_hospital_id, match.recipient_hospital_id,
       req.user.user_id, responseDeadline]
    );
    const offerId = result.insertId;

    // Update organ status to offer_pending
    await pool.query(
      "UPDATE organs SET status = 'offer_pending' WHERE organ_id = ? AND status = 'available'",
      [match.organ_id]
    );

    // Notify the transplant coordinators at the receiving hospital
    const [coordUsers] = await pool.query(
      `SELECT user_id FROM users
       WHERE hospital_id = ? AND role IN ('transplant_coordinator','regional_admin') AND is_active = 1`,
      [match.recipient_hospital_id]
    );

    if (coordUsers.length > 0) {
      const notifValues = coordUsers.map(u => [
        u.user_id, 'offer_received',
        `Organ offer — respond by ${responseDeadline.toLocaleTimeString()}`,
        `Organ #${match.organ_id} offered to your hospital. Offer ID: ${offerId}.`,
        match.organ_id, offerId
      ]);
      await pool.query(
        `INSERT INTO notifications (recipient_user_id, type, title, body, related_organ_id, related_offer_id)
         VALUES ?`,
        [notifValues]
      );
    }

    broadcast('offer_sent', {
      offer_id: offerId,
      organ_id: match.organ_id,
      recipient_id: match.recipient_id,
      response_deadline: responseDeadline
    });

    return res.status(201).json({
      message: 'Offer sent successfully.',
      data: { id: offerId, offer_id: offerId, response_deadline: responseDeadline }
    });
  } catch (err) {
    console.error('sendOffer error:', err);
    return res.status(500).json({ error: 'Failed to send offer.' });
  }
};

// POST /api/offers/:id/accept
// Calls accept_offer(offer_id, user_id, surgeon_name) — matches the actual SP signature
const acceptOffer = async (req, res) => {
  const { id } = req.params;
  const { surgeon_name = null } = req.body;

  try {
    const [offerRows] = await pool.query(
      'SELECT offer_id, organ_id, recipient_id, status, response_deadline FROM offers WHERE offer_id = ?',
      [id]
    );
    if (offerRows.length === 0) return res.status(404).json({ error: 'Offer not found.' });

    const offer = offerRows[0];
    if (offer.status !== 'pending') {
      return res.status(409).json({ error: `Offer cannot be accepted — current status: ${offer.status}` });
    }
    if (new Date(offer.response_deadline) < new Date()) {
      return res.status(410).json({ error: 'Offer has expired past its response deadline.' });
    }

    // SP signature: accept_offer(p_offer_id, p_user_id, p_surgeon_name)
    await pool.query('CALL accept_offer(?, ?, ?)', [
      offer.offer_id,
      req.user.user_id,
      surgeon_name
    ]);

    // Notify coordinators at both hospitals
    const [involvedHospitals] = await pool.query(
      'SELECT offering_hospital_id, receiving_hospital_id FROM offers WHERE offer_id = ?', [id]
    );
    if (involvedHospitals.length > 0) {
      const { offering_hospital_id, receiving_hospital_id } = involvedHospitals[0];
      const hospitalIds = [...new Set([offering_hospital_id, receiving_hospital_id])];
      const [notifUsers] = await pool.query(
        `SELECT user_id FROM users
         WHERE hospital_id IN (?) AND role IN ('transplant_coordinator','national_admin') AND is_active = 1`,
        [hospitalIds]
      );
      if (notifUsers.length > 0) {
        const vals = notifUsers.map(u => [
          u.user_id, 'offer_accepted',
          'Transplant confirmed',
          `Offer #${id} accepted. Transplant coordination initiated for organ #${offer.organ_id}.`,
          offer.organ_id, offer.offer_id
        ]);
        await pool.query(
          `INSERT INTO notifications (recipient_user_id, type, title, body, related_organ_id, related_offer_id)
           VALUES ?`,
          [vals]
        );
      }
    }

    broadcast('offer_accepted', {
      offer_id: Number(id),
      organ_id: offer.organ_id,
      recipient_id: offer.recipient_id
    });

    return res.status(200).json({
      message: 'Offer accepted. Transplant record created by stored procedure.',
      data: { id: Number(id) }
    });
  } catch (err) {
    console.error('acceptOffer error:', err);
    if (err.code === 'ER_SP_DOES_NOT_EXIST') {
      return res.status(503).json({ error: 'accept_offer() SP not found. Run organmatch_complete.sql.' });
    }
    if (err.sqlState === '45000') {
      return res.status(409).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Failed to accept offer.' });
  }
};

// POST /api/offers/:id/decline
const declineOffer = async (req, res) => {
  const { id } = req.params;
  const { decline_reason } = req.body;

  if (!decline_reason) {
    return res.status(400).json({ error: 'decline_reason is required.' });
  }

  try {
    const [offerRows] = await pool.query(
      'SELECT offer_id, organ_id, recipient_id, status, cascade_round FROM offers WHERE offer_id = ?',
      [id]
    );
    if (offerRows.length === 0) return res.status(404).json({ error: 'Offer not found.' });
    if (offerRows[0].status !== 'pending') {
      return res.status(409).json({ error: `Offer cannot be declined — current status: ${offerRows[0].status}` });
    }

    await pool.query(
      `UPDATE offers
       SET status = 'declined', decline_reason = ?, responded_at = NOW(), responded_by = ?
       WHERE offer_id = ?`,
      [decline_reason, req.user.user_id, id]
    );

    // Restore organ to available so next cascade can get an offer
    await pool.query(
      "UPDATE organs SET status = 'available' WHERE organ_id = ? AND status = 'offer_pending'",
      [offerRows[0].organ_id]
    );

    // Notify next rank candidate
    const nextRank = offerRows[0].cascade_round + 1;
    const [nextMatch] = await pool.query(
      `SELECT mr.match_id, mr.recipient_id, mr.recipient_hospital_id, mr.rank_position
       FROM match_results mr
       WHERE mr.organ_id = ? AND mr.status = 'pending' AND mr.ischemic_time_feasible = 1
       ORDER BY mr.rank_position ASC LIMIT 1`,
      [offerRows[0].organ_id]
    );

    if (nextMatch.length > 0) {
      const [nextUsers] = await pool.query(
        `SELECT user_id FROM users
         WHERE hospital_id = ? AND role IN ('transplant_coordinator','regional_admin') AND is_active = 1`,
        [nextMatch[0].recipient_hospital_id]
      );
      if (nextUsers.length > 0) {
        const vals = nextUsers.map(u => [
          u.user_id, 'offer_received',
          `Organ offer — you are now rank #${nextMatch[0].rank_position}`,
          `Previous offer was declined. Organ #${offerRows[0].organ_id} may now be offered to your hospital.`,
          offerRows[0].organ_id, null
        ]);
        await pool.query(
          `INSERT INTO notifications (recipient_user_id, type, title, body, related_organ_id, related_offer_id)
           VALUES ?`,
          [vals]
        );
      }
      broadcast('offer_declined_next_notified', {
        declined_offer_id: Number(id),
        next_match_id: nextMatch[0].match_id,
        next_rank: nextMatch[0].rank_position
      });
    } else {
      broadcast('offer_declined', { offer_id: Number(id) });
    }

    return res.status(200).json({
      message: 'Offer declined.',
      data: {
        id: Number(id),
        next_candidate: nextMatch.length > 0 ? nextMatch[0] : null
      }
    });
  } catch (err) {
    console.error('declineOffer error:', err);
    return res.status(500).json({ error: 'Failed to decline offer.' });
  }
};

const getPendingOffers = async (req, res) => {
  const { limit = 20, organ_id } = req.query;
  try {
    let where = "WHERE o.status = 'pending'";
    const params = [];
    if (organ_id) { where += ' AND o.organ_id = ?'; params.push(organ_id); }
    params.push(parseInt(limit));

    const [rows] = await pool.query(`
      SELECT o.offer_id, o.organ_id, o.recipient_id,
             o.status, o.offered_at, o.response_deadline, o.cascade_round,
             JSON_OBJECT('organ_type', org.organ_type, 'donor_id', org.donor_id) AS organ,
             r.full_name AS recipient_name, r.blood_group,
             rh.name AS receiving_hospital
      FROM offers o
      JOIN organs     org ON o.organ_id     = org.organ_id
      JOIN recipients r   ON o.recipient_id = r.recipient_id
      JOIN hospitals  rh  ON o.receiving_hospital_id = rh.hospital_id
      ${where}
      ORDER BY o.response_deadline ASC
      LIMIT ?
    `, params);

    return res.status(200).json({ offers: rows });
  } catch (err) {
    console.error('getPendingOffers error:', err);
    return res.status(500).json({ error: 'Failed to fetch pending offers.' });
  }
};
module.exports = { sendOffer, acceptOffer, declineOffer, getPendingOffers };