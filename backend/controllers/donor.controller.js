const pool = require('../config/db');
const { broadcast } = require('../websocket/notifier');

// POST /api/donors
const createDonor = async (req, res) => {
  const {
    donor_type, full_name, age, sex, blood_group,
    weight_kg, height_cm, hospital_id, cause_of_death,
    medical_history, brain_death_time,
    hla_a1, hla_a2, hla_b1, hla_b2, hla_dr1, hla_dr2, hla_dq1, hla_dq2,
    hla_typing,   // nested object from frontend { hla_a1, hla_a2, ... }
    serology,     // nested object from frontend { hiv_status, hepatitis_b, ... }
    organs        // array from frontend ['kidney', 'heart', ...]
  } = req.body;

  const effectiveHospitalId =
    req.user.role === 'hospital_staff' ? req.user.hospital_id : hospital_id;

  const ORGAN_VIABILITY_HOURS = {
    heart: 4, lung: 6, liver: 12, pancreas: 12,
    kidney: 24, small_intestine: 8, cornea: 336, bone: 168
  };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Insert donor
    const [result] = await conn.query(
      `INSERT INTO donors
        (donor_type, full_name, age, sex, blood_group, weight_kg, height_cm,
         hospital_id, cause_of_death, medical_history, brain_death_time, registered_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [donor_type, full_name, age, sex, blood_group,
       weight_kg || null, height_cm || null,
       effectiveHospitalId,
       cause_of_death || null,
       medical_history || null,
       brain_death_time || null,
       req.user.user_id]
    );
    const donorId = result.insertId;

    // 2. Insert HLA typing — support both flat fields and nested hla_typing object
    const hla = hla_typing || {};
    const a1  = hla_a1  || hla.hla_a1  || null;
    const a2  = hla_a2  || hla.hla_a2  || null;
    const b1  = hla_b1  || hla.hla_b1  || null;
    const b2  = hla_b2  || hla.hla_b2  || null;
    const dr1 = hla_dr1 || hla.hla_dr1 || null;
    const dr2 = hla_dr2 || hla.hla_dr2 || null;
    const dq1 = hla_dq1 || hla.hla_dq1 || null;
    const dq2 = hla_dq2 || hla.hla_dq2 || null;

    // Always insert HLA row (even if all null) to satisfy FK relationships
    await conn.query(
      `INSERT INTO donor_hla_typing
        (donor_id, hla_a1, hla_a2, hla_b1, hla_b2, hla_dr1, hla_dr2, hla_dq1, hla_dq2)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [donorId, a1, a2, b1, b2, dr1, dr2, dq1, dq2]
    );

    // 3. Insert serology
    const ser = serology || {};
    await conn.query(
      `INSERT INTO donor_serology
        (donor_id, hiv_status, hepatitis_b, hepatitis_c, syphilis, cmv_status, ebv_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [donorId,
       ser.hiv_status   || 'unknown',
       ser.hepatitis_b  || 'unknown',
       ser.hepatitis_c  || 'unknown',
       ser.syphilis     || 'unknown',
       ser.cmv_status   || 'unknown',
       ser.ebv_status   || 'unknown']
    );

    // 4. Insert organs array — each organ triggers match_organ() via DB trigger
    const organList = Array.isArray(organs) ? organs : [];
    const harvestTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const insertedOrgans = [];

    for (const organType of organList) {
      const viabilityHours = ORGAN_VIABILITY_HOURS[organType] || 24;
      const [organResult] = await conn.query(
        `INSERT INTO organs
          (donor_id, organ_type, laterality, harvest_time, viability_hours, expires_at, status)
         VALUES (?, ?, 'na', ?, ?, '2000-01-01', 'available')`,
        [donorId, organType, harvestTime, viabilityHours]
      );
      insertedOrgans.push({ organ_id: organResult.insertId, organ_type: organType });
    }

    await conn.commit();

    // Broadcast after commit so DB trigger has already fired match_organ()
    broadcast('donor_registered', {
      donor_id: donorId,
      full_name,
      blood_group,
      organs: insertedOrgans
    });

    return res.status(201).json({
      message: `Donor registered successfully with ${insertedOrgans.length} organ(s). Matching triggered automatically.`,
      data: {
        id: donorId,
        donor_id: donorId,
        organs: insertedOrgans
      }
    });

  } catch (err) {
    await conn.rollback();
    console.error('createDonor error:', err);
    return res.status(500).json({ error: 'Failed to register donor: ' + err.message });
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

const getOrgansByStatus = async (req, res) => {
  const { status, limit } = req.query;
  try {
    let query = `
      SELECT o.organ_id, o.organ_type, o.laterality, o.harvest_time,
             o.expires_at, o.viability_hours, o.status, o.clinical_data,
             ROUND(TIMESTAMPDIFF(MINUTE, NOW(), o.expires_at)/60.0, 2) AS hours_remaining,
             d.blood_group, d.donor_id,
             h.name AS donor_hospital, h.city, h.latitude, h.longitude
      FROM organs o
      JOIN donors    d ON o.donor_id    = d.donor_id
      JOIN hospitals h ON d.hospital_id = h.hospital_id
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ' AND o.status = ?'; params.push(status); }
    query += ' ORDER BY o.expires_at ASC';
    if (limit)  { query += ' LIMIT ?'; params.push(parseInt(limit)); }

    const [rows] = await pool.query(query, params);
    return res.status(200).json({ data: rows });
  } catch (err) {
    console.error('getOrgansByStatus error:', err);
    return res.status(500).json({ error: 'Failed to fetch organs.' });
  }
};

module.exports = { createDonor, getDonors, createOrgan, getAvailableOrgans, updateOrganStatus, getOrgansByStatus };