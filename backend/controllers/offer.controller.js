const pool = require('../config/db');
const { broadcast } = require('../websocket/notifier');
const { sendNotificationEmail } = require('../services/email.service');

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

    await pool.query(
      "UPDATE match_results SET status = 'offer_sent' WHERE match_id = ?",
      [match_id]
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

    // ── EMAIL: notify donor hospital that an offer has been sent for their organ ──
    try {
      const [donorHospitalUsers] = await pool.query(
        `SELECT u.email, u.full_name, h.name AS hospital_name
         FROM users u
         JOIN hospitals h ON u.hospital_id = h.hospital_id
         WHERE u.hospital_id = ?
           AND u.role IN ('transplant_coordinator', 'regional_admin', 'national_admin')
           AND u.is_active = 1
           AND u.email IS NOT NULL AND u.email != ''`,
        [match.donor_hospital_id]
      );

      const deadline = responseDeadline.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      for (const user of donorHospitalUsers) {
        await sendNotificationEmail(
          user.email,
          `Organ Offer Sent — ${match.organ_type?.toUpperCase()} #${match.organ_id}`,
          `Dear ${user.full_name || 'Coordinator'},\n\n` +
          `An offer has been sent to a recipient hospital for one of your donor's organs.\n\n` +
          `Offer Details:\n` +
          `  • Organ Type    : ${match.organ_type?.toUpperCase()}\n` +
          `  • Organ ID      : #${match.organ_id}\n` +
          `  • Offer ID      : #${offerId}\n` +
          `  • Response By   : ${deadline}\n\n` +
          `The receiving hospital must accept or decline before the deadline. ` +
          `You will be notified of their decision.\n\n` +
          `Log in to OrganMatch to track this offer.`,
          'offer_received'
        );
      }
    } catch (emailErr) {
      console.error('[email] Failed to send donor offer notification:', emailErr.message);
    }

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

    // Inline replacement for missing accept_offer() stored procedure.
    // Fetches donor_id and hospital IDs from organs/donors, then inserts the transplant record.
    const [[organDetail]] = await pool.query(
      `SELECT o.donor_id, o.organ_type,
              d.hospital_id  AS donor_hospital_id,
              TIMESTAMPDIFF(HOUR, o.harvest_time, NOW()) AS cold_ischemia_hrs,
              mr.total_score
       FROM organs o
       JOIN donors d ON o.donor_id = d.donor_id
       LEFT JOIN match_results mr ON mr.organ_id = o.organ_id
                                  AND mr.recipient_id = ?
       WHERE o.organ_id = ?
       LIMIT 1`,
      [offer.recipient_id, offer.organ_id]
    );

    await pool.query(
      `INSERT INTO transplant_records
         (offer_id, organ_id, donor_id, recipient_id,
          donor_hospital_id, recipient_hospital_id,
          transplant_date, surgeon_name,
          cold_ischemia_hrs, total_score_at_match,
          graft_status)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, 'functioning')`,
      [
        offer.offer_id,
        offer.organ_id,
        organDetail.donor_id,
        offer.recipient_id,
        organDetail.donor_hospital_id,
        offer.receiving_hospital_id,
        surgeon_name,
        organDetail.cold_ischemia_hrs ?? 0,
        organDetail.total_score ?? null
      ]
    );

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

    // ── EMAIL: notify recipient hospital that their organ request has been accepted ──
    try {
      const [recipientHospitalUsers] = await pool.query(
        `SELECT u.email, u.full_name, h.name AS hospital_name
         FROM users u
         JOIN hospitals h ON u.hospital_id = h.hospital_id
         WHERE u.hospital_id = ?
           AND u.role IN ('transplant_coordinator', 'regional_admin', 'national_admin')
           AND u.is_active = 1
           AND u.email IS NOT NULL AND u.email != ''`,
        [offer.receiving_hospital_id]
      );

      for (const user of recipientHospitalUsers) {
        await sendNotificationEmail(
          user.email,
          `Organ Request Accepted — ${offer.organ_type?.toUpperCase()} for ${offer.recipient_name}`,
          `Dear ${user.full_name || 'Coordinator'},\n\n` +
          `Great news! The organ offer for your patient has been accepted and the transplant is now confirmed.\n\n` +
          `Transplant Details:\n` +
          `  • Organ Type  : ${offer.organ_type?.toUpperCase()}\n` +
          `  • Organ ID    : #${offer.organ_id}\n` +
          `  • Offer ID    : #${id}\n` +
          `  • Recipient   : ${offer.recipient_name}\n` +
          `  • Donor       : ${offer.donor_name}\n` +
          (surgeon_name ? `  • Surgeon     : ${surgeon_name}\n` : '') +
          `\nPlease coordinate with your surgical team for organ arrival and transplant scheduling.\n` +
          `Log in to OrganMatch to view the full transplant record.`,
          'offer_accepted'
        );
      }
    } catch (emailErr) {
      console.error('[email] Failed to send recipient accept notification:', emailErr.message);
    }

    // ── EMAIL: notify donor hospital that their donor's organ has been successfully donated ──
    try {
      const [donorHospitalUsers] = await pool.query(
        `SELECT u.email, u.full_name, h.name AS hospital_name
         FROM users u
         JOIN hospitals h ON u.hospital_id = h.hospital_id
         WHERE u.hospital_id = ?
           AND u.role IN ('transplant_coordinator', 'regional_admin', 'national_admin')
           AND u.is_active = 1
           AND u.email IS NOT NULL AND u.email != ''`,
        [offer.offering_hospital_id]
      );

      for (const user of donorHospitalUsers) {
        await sendNotificationEmail(
          user.email,
          `Organ Successfully Donated — ${offer.organ_type?.toUpperCase()} from ${offer.donor_name}`,
          `Dear ${user.full_name || 'Coordinator'},\n\n` +
          `We are pleased to inform you that the organ from your donor has been successfully matched and the transplant is now confirmed.\n\n` +
          `Donation Details:\n` +
          `  • Donor Name  : ${offer.donor_name}\n` +
          `  • Organ Type  : ${offer.organ_type?.toUpperCase()}\n` +
          `  • Organ ID    : #${offer.organ_id}\n` +
          `  • Offer ID    : #${id}\n` +
          (surgeon_name ? `  • Surgeon     : ${surgeon_name}\n` : '') +
          `\nThe donor's gift of life has been honoured. The organ has been marked as transplanted in the system.\n` +
          `Thank you for facilitating this life-saving donation.\n\n` +
          `Log in to OrganMatch to view the complete transplant record.`,
          'organ_transplanted_donor'
        );
      }
    } catch (emailErr) {
      console.error('[email] Failed to send donor transplant notification:', emailErr.message);
    }

    return res.status(200).json({
      message: 'Offer accepted. Organ marked transplanted.',
      data: { id: Number(id) }
    });
  } catch (err) {
    console.error('acceptOffer error:', err);
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
      `SELECT o.offer_id, o.match_id, o.organ_id, o.recipient_id, o.status, o.cascade_round, org.organ_type
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

    // Reset match_results FIRST (before organ update which fires trigger)
    await pool.query(
      "UPDATE match_results SET status='pending' WHERE organ_id=? AND recipient_id=? AND status='offer_sent'",
      [offerRows[0].organ_id, offerRows[0].recipient_id]
    );

    // Disable FK checks to prevent trigger cascade conflict on organ update
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    try {
      await pool.query(
        "UPDATE organs SET status='available' WHERE organ_id=? AND status='offer_pending'",
        [offerRows[0].organ_id]
      );
    } finally {
      await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    }

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

    // ── EMAIL: notify the original recipient hospital that their request was declined ──
    try {
      const [offerDetail] = await pool.query(
        `SELECT o.receiving_hospital_id, r.full_name AS recipient_name,
                org.organ_type
         FROM offers o
         JOIN recipients r   ON o.recipient_id = r.recipient_id
         JOIN organs     org ON o.organ_id      = org.organ_id
         WHERE o.offer_id = ?`,
        [id]
      );

      if (offerDetail.length > 0) {
        const detail = offerDetail[0];
        const [recipientHospitalUsers] = await pool.query(
          `SELECT u.email, u.full_name
           FROM users u
           WHERE u.hospital_id = ?
             AND u.role IN ('transplant_coordinator', 'regional_admin', 'national_admin')
             AND u.is_active = 1
             AND u.email IS NOT NULL AND u.email != ''`,
          [detail.receiving_hospital_id]
        );

        for (const user of recipientHospitalUsers) {
          await sendNotificationEmail(
            user.email,
            `Organ Request Declined — ${detail.organ_type?.toUpperCase()} for ${detail.recipient_name}`,
            `Dear ${user.full_name || 'Coordinator'},\n\n` +
            `We regret to inform you that the organ offer for your patient has been declined.\n\n` +
            `Offer Details:\n` +
            `  • Organ Type     : ${detail.organ_type?.toUpperCase()}\n` +
            `  • Offer ID       : #${id}\n` +
            `  • Recipient      : ${detail.recipient_name}\n` +
            `  • Decline Reason : ${decline_reason}\n\n` +
            `The patient remains on the waiting list and will be considered for future matches. ` +
            `Our matching engine will continue to search for compatible organs.\n\n` +
            `Log in to OrganMatch to view the current waiting list status.`,
            'offer_declined'
          );
        }
      }
    } catch (emailErr) {
      console.error('[email] Failed to send recipient decline notification:', emailErr.message);
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