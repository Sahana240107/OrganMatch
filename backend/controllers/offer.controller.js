const pool = require('../config/db');
const { broadcast } = require('../websocket/notifier');

function parseJson(val) {
  if (!val || typeof val === 'object') return val || {};
  try { return JSON.parse(val); } catch { return {}; }
}

// POST /api/offers
const sendOffer = async (req, res) => {
  const { match_id, expiry_minutes = 60 } = req.body;
  if (!match_id) return res.status(400).json({ error: 'match_id is required.' });

  try {
    const [matchRows] = await pool.query(
      `SELECT mr.match_id, mr.organ_id, mr.recipient_id,
              mr.donor_hospital_id, mr.recipient_hospital_id,
              o.organ_type, o.status AS organ_status
       FROM match_results mr
       JOIN organs o ON mr.organ_id = o.organ_id
       WHERE mr.match_id = ? AND mr.status = 'pending'`,
      [match_id]
    );
    if (matchRows.length === 0)
      return res.status(404).json({ error: 'Match not found or no longer pending.' });

    const match = matchRows[0];
    if (match.organ_status !== 'available') {
      return res.status(409).json({
        error: `Organ cannot be offered — current status: "${match.organ_status}". Only available organs can be offered.`
      });
    }

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

    await pool.query(
      "UPDATE organs SET status = 'offer_pending' WHERE organ_id = ? AND status = 'available'",
      [match.organ_id]
    );

    const [coordUsers] = await pool.query(
      `SELECT user_id FROM users
       WHERE hospital_id = ? AND role IN ('transplant_coordinator','regional_admin') AND is_active = 1`,
      [match.recipient_hospital_id]
    );
    if (coordUsers.length > 0) {
      const notifValues = coordUsers.map(u => [
        u.user_id,
        'offer_received',
        `Organ offer — ${match.organ_type?.toUpperCase()} — respond by ${responseDeadline.toLocaleTimeString()}`,
        `Organ #${match.organ_id} (${match.organ_type}) offered to your hospital. Offer ID: ${offerId}.`,
        match.organ_id,
        offerId
      ]);
      await pool.query(
        `INSERT INTO notifications
           (recipient_user_id, type, title, body, related_organ_id, related_offer_id)
         VALUES ?`,
        [notifValues]
      );
    }

    broadcast('offer_sent', {
      offer_id: offerId, organ_id: match.organ_id,
      organ_type: match.organ_type, recipient_id: match.recipient_id,
      response_deadline: responseDeadline
    });

    return res.status(201).json({
      message: 'Offer sent successfully.',
      data: { id: offerId, offer_id: offerId, response_deadline: responseDeadline }
    });
  } catch (err) {
    console.error('sendOffer error:', err);
    return res.status(500).json({ error: 'Failed to send offer: ' + err.message });
  }
};

// PATCH /api/offers/:id/accept
const acceptOffer = async (req, res) => {
  const { id } = req.params;
  const { surgeon_name = null } = req.body;

  try {
    const [offerRows] = await pool.query(
      `SELECT o.offer_id, o.organ_id, o.recipient_id, o.status, o.response_deadline,
              o.offering_hospital_id, o.receiving_hospital_id,
              org.organ_type, d.full_name AS donor_name, r.full_name AS recipient_name
       FROM offers o
       JOIN organs     org ON o.organ_id     = org.organ_id
       JOIN donors     d   ON org.donor_id   = d.donor_id
       JOIN recipients r   ON o.recipient_id = r.recipient_id
       WHERE o.offer_id = ?`,
      [id]
    );
    if (offerRows.length === 0) return res.status(404).json({ error: 'Offer not found.' });

    const offer = offerRows[0];
    if (offer.status !== 'pending')
      return res.status(409).json({ error: `Cannot accept — status: ${offer.status}` });
    if (new Date(offer.response_deadline) < new Date())
      return res.status(410).json({ error: 'Offer has expired.' });

    await pool.query('CALL accept_offer(?, ?, ?)', [offer.offer_id, req.user.user_id, surgeon_name]);

    // Permanently lock organ — never reusable
    await pool.query("UPDATE organs SET status = 'transplanted' WHERE organ_id = ?", [offer.organ_id]);

    await pool.query(
      "UPDATE recipients SET status = 'transplanted' WHERE recipient_id = ? AND status IN ('waiting','offer_received')",
      [offer.recipient_id]
    );

    const [[{ remaining }]] = await pool.query(
      `SELECT COUNT(*) AS remaining FROM organs
       WHERE donor_id = (SELECT donor_id FROM organs WHERE organ_id = ?)
         AND status NOT IN ('transplanted','expired','discarded')`,
      [offer.organ_id]
    );
    if (remaining === 0) {
      await pool.query(
        `UPDATE donors SET status = 'organs_allocated'
         WHERE donor_id = (SELECT donor_id FROM organs WHERE organ_id = ?)`,
        [offer.organ_id]
      );
    }

    // 'transplant_confirmed' IS a valid ENUM value in the notifications table ✓
    const hospitalIds = [...new Set([offer.offering_hospital_id, offer.receiving_hospital_id])];
    const [notifUsers] = await pool.query(
      `SELECT user_id FROM users
       WHERE hospital_id IN (?) AND role IN ('transplant_coordinator','national_admin') AND is_active = 1`,
      [hospitalIds]
    );
    if (notifUsers.length > 0) {
      const vals = notifUsers.map(u => [
        u.user_id,
        'transplant_confirmed',
        `Transplant confirmed — ${offer.organ_type?.toUpperCase()} Offer #${id}`,
        `Offer #${id} accepted. Organ #${offer.organ_id} (${offer.organ_type}) from ${offer.donor_name} → ${offer.recipient_name}. Organ marked as transplanted.`,
        offer.organ_id,
        offer.offer_id
      ]);
      await pool.query(
        `INSERT INTO notifications
           (recipient_user_id, type, title, body, related_organ_id, related_offer_id)
         VALUES ?`,
        [vals]
      );
    }

    broadcast('offer_accepted', {
      offer_id: Number(id), organ_id: offer.organ_id,
      organ_type: offer.organ_type, recipient_id: offer.recipient_id
    });

    return res.status(200).json({
      message: 'Offer accepted. Organ marked transplanted.',
      data: { id: Number(id) }
    });
  } catch (err) {
    console.error('acceptOffer error:', err);
    if (err.code === 'ER_SP_DOES_NOT_EXIST')
      return res.status(503).json({ error: 'accept_offer() SP not found. Run organmatch_complete.sql.' });
    if (err.sqlState === '45000')
      return res.status(409).json({ error: err.message });
    return res.status(500).json({ error: 'Failed to accept offer: ' + err.message });
  }
};

// PATCH /api/offers/:id/decline
const declineOffer = async (req, res) => {
  const { id } = req.params;
  // FIX: frontend sends { reason: } but schema column is decline_reason — accept both
  const decline_reason = req.body.decline_reason || req.body.reason || 'No reason provided';


  try {
    const [offerRows] = await pool.query(
      `SELECT o.offer_id, o.organ_id, o.recipient_id, o.status, o.cascade_round, org.organ_type
       FROM offers o JOIN organs org ON o.organ_id = org.organ_id WHERE o.offer_id = ?`,
      [id]
    );
    if (offerRows.length === 0) return res.status(404).json({ error: 'Offer not found.' });
    if (offerRows[0].status !== 'pending')
      return res.status(409).json({ error: `Cannot decline — status: ${offerRows[0].status}` });

    await pool.query(
      `UPDATE offers SET status='declined', decline_reason=?, responded_at=NOW(), responded_by=?
       WHERE offer_id=?`,
      [decline_reason, req.user.user_id, id]
    );

    await pool.query(
      "UPDATE organs SET status='available' WHERE organ_id=? AND status='offer_pending'",
      [offerRows[0].organ_id]
    );

    const [nextMatch] = await pool.query(
      `SELECT mr.match_id, mr.recipient_id, mr.recipient_hospital_id, mr.rank_position
       FROM match_results mr
       WHERE mr.organ_id=? AND mr.status='pending' AND mr.ischemic_time_feasible=1
         AND mr.recipient_id != ?
       ORDER BY mr.rank_position ASC LIMIT 1`,
      [offerRows[0].organ_id, offerRows[0].recipient_id]
    );

    if (nextMatch.length > 0) {
      const [nextUsers] = await pool.query(
        `SELECT user_id FROM users
         WHERE hospital_id=? AND role IN ('transplant_coordinator','regional_admin') AND is_active=1`,
        [nextMatch[0].recipient_hospital_id]
      );
      if (nextUsers.length > 0) {
        const vals = nextUsers.map(u => [
          u.user_id,
          'offer_received',
          `Organ available — ${offerRows[0].organ_type?.toUpperCase()} (Rank #${nextMatch[0].rank_position})`,
          `Previous offer declined. Organ #${offerRows[0].organ_id} may now be offered to your hospital.`,
          offerRows[0].organ_id,
          null
        ]);
        await pool.query(
          `INSERT INTO notifications
             (recipient_user_id, type, title, body, related_organ_id, related_offer_id)
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
      message: 'Offer declined. Organ restored to available.',
      data: { id: Number(id), next_candidate: nextMatch[0] || null }
    });
  } catch (err) {
    console.error('declineOffer error:', err);
    return res.status(500).json({ error: 'Failed to decline offer: ' + err.message });
  }
};

// GET /api/offers/pending — only status='pending'
const getPendingOffers = async (req, res) => {
  const { limit = 20 } = req.query;
  try {
    const [rows] = await pool.query(`
      SELECT o.offer_id, o.organ_id, o.recipient_id,
             o.status, o.offered_at, o.response_deadline, o.cascade_round, o.decline_reason,
             JSON_OBJECT('organ_type', org.organ_type, 'donor_id', org.donor_id) AS organ,
             JSON_OBJECT('full_name', r.full_name, 'blood_group', r.blood_group,
                         'medical_urgency', r.medical_urgency) AS recipient,
             JSON_OBJECT('name', rh.name, 'city', rh.city) AS receiving_hospital
      FROM offers o
      JOIN organs     org ON o.organ_id              = org.organ_id
      JOIN recipients r   ON o.recipient_id          = r.recipient_id
      JOIN hospitals  rh  ON o.receiving_hospital_id = rh.hospital_id
      WHERE o.status = 'pending'
      ORDER BY o.response_deadline ASC
      LIMIT ?
    `, [parseInt(limit)]);

    const offers = rows.map(row => ({
      ...row,
      organ:              parseJson(row.organ),
      recipient:          parseJson(row.recipient),
      receiving_hospital: parseJson(row.receiving_hospital),
    }));
    return res.status(200).json({ offers });
  } catch (err) {
    console.error('getPendingOffers error:', err);
    return res.status(500).json({ error: 'Failed to fetch pending offers: ' + err.message });
  }
};

// GET /api/offers?organ_id=X — cascade history for one organ
const getOffersByOrgan = async (req, res) => {
  const { organ_id, limit = 50 } = req.query;
  if (!organ_id) return getPendingOffers(req, res);

  try {
    const [rows] = await pool.query(`
      SELECT o.offer_id, o.organ_id, o.recipient_id,
             o.status, o.offered_at, o.response_deadline,
             o.cascade_round, o.decline_reason, o.responded_at,
             JSON_OBJECT('organ_type', org.organ_type, 'donor_id', org.donor_id) AS organ,
             JSON_OBJECT('full_name', r.full_name, 'blood_group', r.blood_group,
                         'medical_urgency', r.medical_urgency) AS recipient,
             JSON_OBJECT('name', rh.name, 'city', rh.city) AS receiving_hospital
      FROM offers o
      JOIN organs     org ON o.organ_id              = org.organ_id
      JOIN recipients r   ON o.recipient_id          = r.recipient_id
      JOIN hospitals  rh  ON o.receiving_hospital_id = rh.hospital_id
      WHERE o.organ_id = ?
      ORDER BY o.cascade_round ASC, o.offered_at ASC
      LIMIT ?
    `, [organ_id, parseInt(limit)]);

    const offers = rows.map(row => ({
      ...row,
      organ:              parseJson(row.organ),
      recipient:          parseJson(row.recipient),
      receiving_hospital: parseJson(row.receiving_hospital),
    }));
    return res.status(200).json({ offers });
  } catch (err) {
    console.error('getOffersByOrgan error:', err);
    return res.status(500).json({ error: 'Failed to fetch cascade history: ' + err.message });
  }
};

// GET /api/offers/recent — ALL offers any status, newest first (shows seed data too)
const getRecentOffers = async (req, res) => {
  const { limit = 50 } = req.query;
  try {
    // FIX: use flat columns instead of JSON_OBJECT — more compatible across MySQL versions
    const [rows] = await pool.query(`
      SELECT o.offer_id, o.organ_id, o.recipient_id, o.match_id,
             o.status, o.offered_at, o.response_deadline, o.responded_at,
             o.cascade_round, o.decline_reason,
             o.offering_hospital_id, o.receiving_hospital_id,
             org.organ_type,
             r.full_name   AS recipient_name,
             r.blood_group AS recipient_blood,
             r.medical_urgency,
             rh.name       AS receiving_hospital_name,
             rh.city       AS receiving_hospital_city,
             oh.name       AS offering_hospital_name
      FROM offers o
      JOIN organs     org ON o.organ_id              = org.organ_id
      JOIN recipients r   ON o.recipient_id          = r.recipient_id
      JOIN hospitals  rh  ON o.receiving_hospital_id = rh.hospital_id
      JOIN hospitals  oh  ON o.offering_hospital_id  = oh.hospital_id
      ORDER BY o.offered_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    // Shape into the nested format the frontend expects
    const offers = rows.map(row => ({
      offer_id:              row.offer_id,
      organ_id:              row.organ_id,
      recipient_id:          row.recipient_id,
      match_id:              row.match_id,
      status:                row.status,
      offered_at:            row.offered_at,
      response_deadline:     row.response_deadline,
      responded_at:          row.responded_at,
      cascade_round:         row.cascade_round,
      decline_reason:        row.decline_reason,
      offering_hospital_id:  row.offering_hospital_id,
      receiving_hospital_id: row.receiving_hospital_id,
      organ:              { organ_type: row.organ_type },
      recipient:          { full_name: row.recipient_name, blood_group: row.recipient_blood, medical_urgency: row.medical_urgency },
      receiving_hospital: { name: row.receiving_hospital_name, city: row.receiving_hospital_city },
      offering_hospital:  { name: row.offering_hospital_name },
    }));
    return res.status(200).json({ offers });
  } catch (err) {
    console.error('getRecentOffers error:', err);
    return res.status(500).json({ error: 'Failed to fetch recent offers: ' + err.message });
  }
};

// FIX: GET /api/offers/:id/cascade — was completely missing, OfferWorkflow timeline panel calls this
const getCascade = async (req, res) => {
  const { id } = req.params;
  try {
    // Find the organ_id for this offer, then return all offers for that organ in cascade order
    const [offerRows] = await pool.query(
      'SELECT organ_id FROM offers WHERE offer_id = ?', [id]
    );
    if (offerRows.length === 0) return res.status(404).json({ error: 'Offer not found.' });
    const organ_id = offerRows[0].organ_id;

    const [rows] = await pool.query(`
      SELECT o.offer_id, o.organ_id, o.recipient_id,
             o.status, o.offered_at, o.response_deadline,
             o.cascade_round, o.decline_reason, o.responded_at,
             JSON_OBJECT('organ_type', org.organ_type) AS organ,
             JSON_OBJECT('full_name', r.full_name, 'blood_group', r.blood_group,
                         'medical_urgency', r.medical_urgency) AS recipient,
             JSON_OBJECT('name', rh.name, 'city', rh.city) AS receiving_hospital
      FROM offers o
      JOIN organs     org ON o.organ_id              = org.organ_id
      JOIN recipients r   ON o.recipient_id          = r.recipient_id
      JOIN hospitals  rh  ON o.receiving_hospital_id = rh.hospital_id
      WHERE o.organ_id = ? AND o.offer_id != ?
      ORDER BY o.cascade_round ASC, o.offered_at ASC
    `, [organ_id, id]);

    const offers = rows.map(row => ({
      ...row,
      organ:              parseJson(row.organ),
      recipient:          parseJson(row.recipient),
      receiving_hospital: parseJson(row.receiving_hospital),
    }));
    return res.status(200).json({ offers });
  } catch (err) {
    console.error('getCascade error:', err);
    return res.status(500).json({ error: 'Failed to fetch cascade.: ' + err.message });
  }
};

module.exports = {
  sendOffer, acceptOffer, declineOffer,
  getPendingOffers, getOffersByOrgan, getRecentOffers, getCascade,
};