const pool = require('../config/db');

const getSummary = async (req, res) => {
  try {
    const [[activeOrgans]]  = await pool.query("SELECT COUNT(*) AS c FROM organs WHERE status IN ('available','offer_pending')");
    const [[waiting]]       = await pool.query("SELECT COUNT(*) AS c FROM recipients WHERE status='waiting'");
    const [[pendingOffers]] = await pool.query("SELECT COUNT(*) AS c FROM offers WHERE status='pending'");
    const [[s1a]]           = await pool.query("SELECT COUNT(*) AS c FROM recipients WHERE medical_urgency='status_1a' AND status='waiting'");
    const [[s1b]]           = await pool.query("SELECT COUNT(*) AS c FROM recipients WHERE medical_urgency='status_1b' AND status='waiting'");
    const [[transplants]]   = await pool.query("SELECT COUNT(*) AS c FROM transplant_records");
    const [[donors]]        = await pool.query("SELECT COUNT(*) AS c FROM donors");
    const [byOrganType]     = await pool.query(`
      SELECT o.organ_type, COUNT(*) AS count
      FROM transplant_records tr
      JOIN organs o ON tr.organ_id = o.organ_id
      GROUP BY o.organ_type ORDER BY count DESC
    `);

    return res.status(200).json({
      active_organs:        activeOrgans.c,
      waiting_recipients:   waiting.c,
      pending_offers:       pendingOffers.c,
      status_1a:            s1a.c,
      status_1b:            s1b.c,
      total_donors:         donors.c,
      total_transplants:    transplants.c,
      transplants_by_organ: byOrganType,
    });
  } catch (err) {
    console.error('getSummary error:', err);
    return res.status(500).json({ error: 'Failed to fetch analytics summary.' });
  }
};

const getTrends = async (req, res) => {
  try {
    const [daily] = await pool.query(`
      SELECT DATE_FORMAT(transplant_date, '%d %b') AS label,
             COUNT(*) AS transplants
      FROM transplant_records
      WHERE transplant_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY transplant_date
      ORDER BY transplant_date ASC
    `);
    const [donors] = await pool.query(`
      SELECT DATE_FORMAT(DATE(created_at), '%d %b') AS label,
             COUNT(*) AS donors
      FROM donors
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at), DATE_FORMAT(DATE(created_at), '%d %b')
      ORDER BY DATE(created_at) ASC
    `);
    const trend = daily.map(d => ({
      label:       d.label,
      transplants: d.transplants,
      donors:      donors.find(x => x.label === d.label)?.donors || 0
    }));
    const [organCounts] = await pool.query(`
      SELECT o.organ_type, COUNT(*) AS count
      FROM transplant_records tr
      JOIN organs o ON tr.organ_id = o.organ_id
      GROUP BY o.organ_type ORDER BY count DESC
    `);
    return res.status(200).json({ daily_trend: trend, organ_counts: organCounts });
  } catch (err) {
    console.error('getTrends error:', err);
    return res.status(500).json({ error: 'Failed to fetch trends.' });
  }
};

const getMatchingKpis = async (req, res) => {
  try {
    const [[stats]] = await pool.query(`
      SELECT COUNT(*) AS total_matches,
             AVG(total_score) AS avg_score,
             SUM(ischemic_time_feasible = 1) AS feasible_matches,
             AVG(distance_km) AS avg_distance_km
      FROM match_results
    `);
    return res.status(200).json({ data: stats });
  } catch (err) {
    console.error('getMatchingKpis error:', err);
    return res.status(500).json({ error: 'Failed to fetch matching KPIs.' });
  }
};

// GET /api/analytics/transplant-summary
// Returns: total, survival_rate, avg_ischemic_hours, graft_failures, by_organ, by_month
const getTransplantSummary = async (req, res) => {
  try {
    const [[totals]] = await pool.query(`
      SELECT
        COUNT(*)                                                        AS total,
        ROUND(SUM(graft_status = 'functioning') / COUNT(*) * 100, 1)  AS survival_rate,
        ROUND(AVG(cold_ischemia_hrs), 1)                               AS avg_ischemic_hours,
        SUM(graft_status IN ('graft_failure','rejected'))              AS graft_failures
      FROM transplant_records
    `);

    const [byOrgan] = await pool.query(`
      SELECT o.organ_type, COUNT(*) AS count,
             SUM(tr.graft_status = 'functioning') AS successful
      FROM transplant_records tr
      JOIN organs o ON tr.organ_id = o.organ_id
      GROUP BY o.organ_type
    `);

    const [byMonth] = await pool.query(`
      SELECT DATE_FORMAT(transplant_date, '%Y-%m') AS month,
             COUNT(*) AS count
      FROM transplant_records
      GROUP BY month ORDER BY month DESC LIMIT 12
    `);

    return res.status(200).json({
      total:              totals.total,
      survival_rate:      totals.survival_rate,
      avg_ischemic_hours: totals.avg_ischemic_hours,
      graft_failures:     totals.graft_failures,
      by_organ:           byOrgan,
      by_month:           byMonth
    });
  } catch (err) {
    console.error('getTransplantSummary error:', err);
    return res.status(500).json({ error: 'Failed to fetch transplant summary.' });
  }
};

const getWaitingListCounts = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT organ_needed AS organ_type,
             COUNT(*) AS count,
             AVG(TIMESTAMPDIFF(MONTH, registration_date, NOW())) AS avg_wait,
             SUM(medical_urgency = 'status_1a') AS critical
      FROM recipients WHERE status = 'waiting'
      GROUP BY organ_needed
    `);
    const counts = {};
    rows.forEach(r => {
      counts[r.organ_type]              = r.count;
      counts[`${r.organ_type}_avg_wait`] = Math.round(r.avg_wait || 0);
      counts[`${r.organ_type}_critical`] = r.critical;
    });
    return res.status(200).json({ counts, by_organ: rows });
  } catch (err) {
    console.error('getWaitingListCounts error:', err);
    return res.status(500).json({ error: 'Failed to fetch waiting list counts.' });
  }
};

const getFull = async (req, res) => {
  try {
    const [[summary]]    = await pool.query('SELECT * FROM vw_analytics_summary LIMIT 1').catch(() => [[{}]]);
    const [topHospitals] = await pool.query(`
      SELECT h.name AS hospital, COUNT(*) AS transplants,
             ROUND(SUM(tr.graft_status='functioning')/COUNT(*)*100,1) AS success_rate
      FROM transplant_records tr
      JOIN hospitals h ON tr.recipient_hospital_id = h.hospital_id
      GROUP BY h.hospital_id ORDER BY transplants DESC LIMIT 5
    `);
    return res.status(200).json({ summary, top_hospitals: topHospitals });
  } catch (err) {
    console.error('getFull error:', err);
    return res.status(500).json({ error: 'Failed to fetch full analytics.' });
  }
};

module.exports = {
  getSummary, getTrends, getFull,
  getMatchingKpis, getTransplantSummary, getWaitingListCounts
};