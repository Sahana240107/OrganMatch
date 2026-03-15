// Key change: column is graft_status (not outcome)
// transplant_records has composite PK (transplant_id, transplant_date) — query by transplant_id only

const pool = require('../config/db');

const getTransplants = async (req, res) => {
  const { from_date, to_date, organ_type } = req.query;

  try {
    let query = `
      SELECT
        tr.transplant_id, tr.transplant_date, tr.surgery_start_time, tr.surgery_end_time,
        o.organ_type, tr.cold_ischemia_hrs, tr.warm_ischemia_mins,
        tr.total_score_at_match, tr.surgeon_name, tr.graft_status, tr.rejection_episodes,
        d.full_name   AS donor_name,    d.blood_group AS donor_blood,
        r.full_name   AS recipient_name, r.blood_group AS recipient_blood,
        dh.name AS donor_hospital, rh.name AS recipient_hospital
      FROM transplant_records tr
      JOIN organs     o  ON tr.organ_id         = o.organ_id
      JOIN donors     d  ON tr.donor_id         = d.donor_id
      JOIN recipients r  ON tr.recipient_id     = r.recipient_id
      JOIN hospitals  dh ON tr.donor_hospital_id    = dh.hospital_id
      JOIN hospitals  rh ON tr.recipient_hospital_id = rh.hospital_id
      WHERE 1=1
    `;
    const params = [];

    if (from_date)  { query += ' AND tr.transplant_date >= ?'; params.push(from_date); }
    if (to_date)    { query += ' AND tr.transplant_date <= ?'; params.push(to_date); }
    if (organ_type) { query += ' AND o.organ_type = ?';         params.push(organ_type); }

    query += ' ORDER BY tr.transplant_date DESC LIMIT 200';

    const [rows] = await pool.query(query, params);
    return res.status(200).json({ data: rows, count: rows.length });
  } catch (err) {
    console.error('getTransplants error:', err);
    return res.status(500).json({ error: 'Failed to fetch transplant records.' });
  }
};

module.exports = { getTransplants };