const pool = require('../config/db');
const { broadcast } = require('../websocket/notifier');

// POST /api/donors
const createDonor = async (req, res) => {
  const {
    donor_type, full_name, age, sex, blood_group,
    weight_kg, height_cm, hospital_id, cause_of_death, medical_history,
    // HLA fields (optional — go into donor_hla_typing)
    hla_a1, hla_a2, hla_b1, hla_b2, hla_dr1, hla_dr2, hla_dq1, hla_dq2
  } = req.body;

  const effectiveHospitalId =
    req.user.role === 'hospital_staff' ? req.user.hospital_id : hospital_id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO donors
        (donor_type, full_name, age, sex, blood_group, weight_kg, height_cm,
         hospital_id, cause_of_death, medical_history, registered_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [donor_type, full_name, age, sex, blood_group,
       weight_kg || null, height_cm || null,
       effectiveHospitalId, cause_of_death || null,
       medical_history || null, req.user.user_id]
    );
    const donorId = result.insertId;

    // Insert HLA typing into separate table if any HLA fields provided
    if (hla_a1 || hla_b1 || hla_dr1) {
      await conn.query(
        `INSERT INTO donor_hla_typing
          (donor_id, hla_a1, hla_a2, hla_b1, hla_b2, hla_dr1, hla_dr2, hla_dq1, hla_dq2)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [donorId,
         hla_a1 || null, hla_a2 || null, hla_b1 || null, hla_b2 || null,
         hla_dr1 || null, hla_dr2 || null, hla_dq1 || null, hla_dq2 || null]
      );
    }

    await conn.commit();
    broadcast('donor_registered', { donor_id: donorId, full_name, blood_group });

    return res.status(201).json({
      message: 'Donor registered successfully.',
      data: { id: donorId, donor_id: donorId }
    });
  } catch (err) {
    await conn.rollback();
    console.error('createDonor error:', err);
    return res.status(500).json({ error: 'Failed to register donor.' });
  } finally {
    conn.release();
  }
};

// GET /api/donors
const getDonors = async (req, res) => {
  try {
    let query = `
      SELECT d.donor_id, d.full_name, d.donor_type, d.blood_group,
             d.age, d.sex, d.status, d.created_at, h.name AS hospital_name
      FROM donors d
      JOIN hospitals h ON d.hospital_id = h.hospital_id
    `;
    const params = [];
    if (req.user.role === 'hospital_staff') {
      query += ' WHERE d.hospital_id = ?';
      params.push(req.user.hospital_id);
    }
    query += ' ORDER BY d.created_at DESC LIMIT 100';

    const [rows] = await pool.query(query, params);
    return res.status(200).json({ data: rows });
  } catch (err) {
    console.error('getDonors error:', err);
    return res.status(500).json({ error: 'Failed to fetch donors.' });
  }
};

// POST /api/donors/organs  (organ registration)
const createOrgan = async (req, res) => {
  const { donor_id, organ_type, viability_hours, harvest_time, laterality, clinical_data, notes } = req.body;

  if (!donor_id || !organ_type || !viability_hours || !harvest_time) {
    return res.status(400).json({ error: 'donor_id, organ_type, viability_hours, and harvest_time are required.' });
  }

  try {
    const [donorRows] = await pool.query(
      'SELECT hospital_id FROM donors WHERE donor_id = ?', [donor_id]
    );
    if (donorRows.length === 0) return res.status(404).json({ error: 'Donor not found.' });

    if (req.user.role === 'hospital_staff' &&
        donorRows[0].hospital_id !== req.user.hospital_id) {
      return res.status(403).json({ error: 'You can only add organs for donors at your hospital.' });
    }

    // expires_at is computed automatically by trg_organ_before_insert trigger
    // status starts as 'available' which fires trg_organ_after_insert → match_organ()
    const [result] = await pool.query(
      `INSERT INTO organs
        (donor_id, organ_type, laterality, harvest_time, viability_hours,
         expires_at, clinical_data, status, notes)
       VALUES (?, ?, ?, ?, ?, '2000-01-01', ?, 'available', ?)`,
      [donor_id, organ_type, laterality || 'na', harvest_time,
       viability_hours,
       clinical_data ? JSON.stringify(clinical_data) : null,
       notes || null]
    );

    const organId = result.insertId;
    broadcast('organ_available', { organ_id: organId, organ_type, viability_hours });

    return res.status(201).json({
      message: 'Organ registered. Matching triggered automatically by DB trigger.',
      data: { id: organId, organ_id: organId }
    });
  } catch (err) {
    console.error('createOrgan error:', err);
    return res.status(500).json({ error: 'Failed to register organ.' });
  }
};

// GET /api/donors/organs/available  — uses the vw_available_organs view
const getAvailableOrgans = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT organ_id, organ_type, laterality, harvest_time, expires_at,
             viability_hours, hours_remaining, viability_pct,
             blood_group, hla_a1, hla_a2, hla_b1, hla_b2, hla_dr1, hla_dr2,
             donor_hospital, donor_city, latitude, longitude
      FROM vw_available_organs
    `);
    return res.status(200).json({ data: rows });
  } catch (err) {
    console.error('getAvailableOrgans error:', err);
    return res.status(500).json({ error: 'Failed to fetch available organs.' });
  }
};

// PATCH /api/donors/organs/:id/status
const updateOrganStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ['available', 'offer_pending', 'allocated', 'transplanted', 'expired', 'discarded'];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  try {
    const [result] = await pool.query(
      'UPDATE organs SET status = ? WHERE organ_id = ?', [status, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Organ not found.' });

    broadcast('organ_status_changed', { organ_id: Number(id), status });
    return res.status(200).json({ message: 'Organ status updated.', data: { id: Number(id) } });
  } catch (err) {
    console.error('updateOrganStatus error:', err);
    return res.status(500).json({ error: 'Failed to update organ status.' });
  }
};

module.exports = { createDonor, getDonors, createOrgan, getAvailableOrgans, updateOrganStatus };