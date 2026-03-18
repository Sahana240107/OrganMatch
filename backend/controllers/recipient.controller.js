const pool = require('../config/db');

// POST /api/recipients
const createRecipient = async (req, res) => {
  const {
    full_name, age, sex, blood_group, organ_needed,
    primary_diagnosis, registration_date, medical_urgency,
    hospital_id, pra_percent, weight_kg, height_cm,
    // HLA fields
    hla_a1, hla_a2, hla_b1, hla_b2, hla_dr1, hla_dr2, hla_dq1, hla_dq2
  } = req.body;

  const effectiveHospitalId =
    req.user.role === 'hospital_staff' ? req.user.hospital_id : hospital_id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO recipients
        (full_name, age, sex, blood_group, organ_needed,
         primary_diagnosis, registration_date, medical_urgency,
         hospital_id, pra_percent, weight_kg, height_cm, registered_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [full_name, age, sex, blood_group, organ_needed,
       primary_diagnosis, registration_date, medical_urgency,
       effectiveHospitalId, pra_percent || 0,
       weight_kg || null, height_cm || null, req.user.user_id]
    );
    const recipientId = result.insertId;
    // NOTE: trg_recipient_urgency_insert fires automatically on INSERT above
    // and populates recipient_urgency_cache — no manual insert needed.

    // HLA typing goes into recipient_hla_typing
    if (hla_a1 || hla_b1 || hla_dr1) {
      await conn.query(
        `INSERT INTO recipient_hla_typing
          (recipient_id, hla_a1, hla_a2, hla_b1, hla_b2, hla_dr1, hla_dr2, hla_dq1, hla_dq2)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [recipientId,
         hla_a1 || null, hla_a2 || null, hla_b1 || null, hla_b2 || null,
         hla_dr1 || null, hla_dr2 || null, hla_dq1 || null, hla_dq2 || null]
      );
    }

    await conn.commit();
    return res.status(201).json({
      message: 'Recipient registered successfully.',
      data: { id: recipientId, recipient_id: recipientId }
    });
  } catch (err) {
    await conn.rollback();
    console.error('createRecipient error:', err);
    return res.status(500).json({ error: 'Failed to register recipient.: ' + err.message });
  } finally {
    conn.release();
  }
};

// GET /api/recipients/waiting-list  — uses vw_waiting_list view
const getWaitingList = async (req, res) => {
  const { organ_type, blood_group, medical_urgency } = req.query;

  try {
    // Direct query - never uses vw_waiting_list to avoid view compatibility issues
    let where = "r.status = 'waiting'";
    const params = [];

    if (req.user.role === 'hospital_staff' && req.user.hospital_id) {
      where += ' AND r.hospital_id = ?';
      params.push(req.user.hospital_id);
    }
    if (organ_type)      { where += ' AND r.organ_needed = ?';    params.push(organ_type); }
    if (blood_group)     { where += ' AND r.blood_group = ?';     params.push(blood_group); }
    if (medical_urgency) { where += ' AND r.medical_urgency = ?'; params.push(medical_urgency); }

    const [rows] = await pool.query(`
      SELECT
        r.recipient_id, r.full_name, r.age, r.sex, r.blood_group,
        r.organ_needed, r.medical_urgency, r.pra_percent,
        r.registration_date, r.status,
        TIMESTAMPDIFF(MONTH, r.registration_date, NOW()) AS wait_months,
        COALESCE(ruc.urgency_score, 0)  AS urgency_score,
        COALESCE(rcs.meld_score, NULL)  AS meld_score,
        COALESCE(rcs.las_score,  NULL)  AS las_score,
        h.hospital_id, h.name AS hospital_name, h.city, h.state,
        JSON_OBJECT('name', h.name, 'city', h.city) AS hospital
      FROM recipients r
      JOIN hospitals h ON r.hospital_id = h.hospital_id
      LEFT JOIN recipient_urgency_cache   ruc ON ruc.recipient_id = r.recipient_id
      LEFT JOIN recipient_clinical_scores rcs ON rcs.recipient_id = r.recipient_id
      WHERE ${where}
        AND r.recipient_id IN (
          SELECT MIN(r2.recipient_id) FROM recipients r2
          WHERE r2.status = 'waiting'
          GROUP BY r2.full_name, r2.organ_needed, r2.blood_group
        )
      ORDER BY COALESCE(ruc.urgency_score, 0) DESC, r.registration_date ASC
      LIMIT 200
    `, params);

    return res.status(200).json({ recipients: rows, count: rows.length });
  } catch (err) {
    console.error('getWaitingList error:', err);
    return res.status(500).json({ error: 'Failed to fetch waiting list: ' + err.message });
  }
};
// PATCH /api/recipients/:id/urgency
const updateUrgency = async (req, res) => {
  const { id } = req.params;
  const { medical_urgency } = req.body;

  const validLevels = ['status_1a', 'status_1b', 'status_2', 'status_3'];
  if (!medical_urgency || !validLevels.includes(medical_urgency)) {
    return res.status(400).json({ error: `medical_urgency must be one of: ${validLevels.join(', ')}` });
  }

  try {
    const [result] = await pool.query(
      'UPDATE recipients SET medical_urgency = ? WHERE recipient_id = ?',
      [medical_urgency, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Recipient not found.' });
    // trg_recipient_urgency_update fires automatically and refreshes recipient_urgency_cache
    return res.status(200).json({
      message: 'Urgency updated. Urgency cache refreshed by trigger.',
      data: { id: Number(id), medical_urgency }
    });
  } catch (err) {
    console.error('updateUrgency error:', err);
    return res.status(500).json({ error: 'Failed to update urgency.: ' + err.message });
  }
};

// GET /api/recipients  — paginated, with filters
const getRecipients = async (req, res) => {
  const { page = 1, limit = 20, search, organ_needed, medical_urgency, blood_group } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    // FIX 1: always filter by status='waiting' so transplanted recipients don't corrupt MIN() dedupe
    let where = "WHERE r.status = 'waiting'";
    const params = [];

    if (search) {
      where += ' AND (r.full_name LIKE ? OR r.recipient_id = ?)';
      params.push(`%${search}%`, parseInt(search) || 0);
    }
    if (organ_needed)    { where += ' AND r.organ_needed = ?';    params.push(organ_needed); }
    if (medical_urgency) { where += ' AND r.medical_urgency = ?'; params.push(medical_urgency); }
    if (blood_group)     { where += ' AND r.blood_group = ?';     params.push(blood_group); }

    if (req.user.role === 'hospital_staff') {
      where += ' AND r.hospital_id = ?';
      params.push(req.user.hospital_id);
    }

    // NO dedupe here — the recipients page shows all waiting recipients as-is.
    // Deduplication only belongs in the waiting-list endpoint where rank ordering matters.
    // Applying MIN(recipient_id) dedupe here was silently dropping pancreas/cornea patients
    // whose IDs happened to be higher than other organ-type recipients.
    const countParams = [...params];
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM recipients r ${where}`, countParams
    );

    params.push(parseInt(limit), offset);
    const [rows] = await pool.query(`
      SELECT r.recipient_id, r.full_name, r.age, r.sex, r.blood_group,
             r.organ_needed, r.medical_urgency, r.pra_percent,
             r.status, r.registration_date,
             TIMESTAMPDIFF(MONTH, r.registration_date, NOW()) AS wait_months,
             h.name AS hospital_name, h.city AS hospital_city, h.hospital_id
      FROM recipients r
      JOIN hospitals h ON r.hospital_id = h.hospital_id
      ${where}
      ORDER BY r.medical_urgency ASC, r.registration_date ASC
      LIMIT ? OFFSET ?
    `, params);

    return res.status(200).json({
      recipients: rows,
      total,
      page: parseInt(page),
      has_more: offset + rows.length < total
    });
  } catch (err) {
    console.error('getRecipients error:', err);
    return res.status(500).json({ error: 'Failed to fetch recipients.: ' + err.message });
  }
};
// GET /api/recipients/:id — single recipient by ID
const getRecipientById = async (req, res) => {
  const { id } = req.params
  try {
    const [rows] = await pool.query(`
      SELECT r.recipient_id, r.full_name, r.age, r.sex, r.blood_group,
             r.organ_needed, r.medical_urgency, r.pra_percent,
             r.status, r.registration_date,
             h.name AS hospital_name, h.city, h.state, h.hospital_id
      FROM recipients r
      JOIN hospitals h ON r.hospital_id = h.hospital_id
      WHERE r.recipient_id = ?
    `, [id])
    if (!rows.length) return res.status(404).json({ error: 'Recipient not found.' })
    return res.status(200).json({ data: rows[0], recipient: rows[0] })
  } catch (err) {
    console.error('getRecipientById error:', err)
    return res.status(500).json({ error: 'Failed to fetch recipient: ' + err.message })
  }
}

module.exports = { createRecipient, getRecipients, getWaitingList, updateUrgency, getRecipientById };