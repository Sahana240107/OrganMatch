const pool = require('../config/db');

const getTransplants = async (req, res) => {
  const { from_date, to_date, organ_type, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let where = 'WHERE 1=1';
    const params = [];

    if (from_date)  { where += ' AND tr.transplant_date >= ?'; params.push(from_date); }
    if (to_date)    { where += ' AND tr.transplant_date <= ?'; params.push(to_date); }
    if (organ_type) { where += ' AND o.organ_type = ?';        params.push(organ_type); }

    const countParams = [...params];
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM transplant_records tr
       JOIN organs o ON tr.organ_id = o.organ_id
       ${where}`, countParams
    );

    params.push(parseInt(limit), offset);
    const [rows] = await pool.query(`
      SELECT tr.transplant_id, tr.transplant_date, tr.surgeon_name,
             tr.graft_status, tr.graft_status AS outcome,
             tr.cold_ischemia_hrs,
             ROUND(IFNULL(tr.cold_ischemia_hrs,0) * 60) AS ischemic_time_minutes,
             tr.total_score_at_match, tr.total_score_at_match AS match_score,
             tr.rejection_episodes,
             tr.donor_id, tr.recipient_id,
             o.organ_type,
             d.full_name AS donor_name, d.blood_group AS donor_blood,
             r.full_name AS recipient_name, r.blood_group AS recipient_blood,
             dh.name AS donor_hospital, rh.name AS recipient_hospital
      FROM transplant_records tr
      JOIN organs     o  ON tr.organ_id              = o.organ_id
      JOIN donors     d  ON tr.donor_id              = d.donor_id
      JOIN recipients r  ON tr.recipient_id          = r.recipient_id
      JOIN hospitals  dh ON tr.donor_hospital_id     = dh.hospital_id
      JOIN hospitals  rh ON tr.recipient_hospital_id = rh.hospital_id
      ${where}
      ORDER BY tr.transplant_date DESC
      LIMIT ? OFFSET ?
    `, params);

    return res.status(200).json({
      transplants: rows,
      total,
      page: parseInt(page),
      has_more: offset + rows.length < total
    });
  } catch (err) {
    console.error('getTransplants error:', err);
    return res.status(500).json({ error: 'Failed to fetch transplant records.: ' + err.message });
  }
};

module.exports = { getTransplants };