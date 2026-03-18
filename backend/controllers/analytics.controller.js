const pool = require('../config/db');

// GET /api/analytics/summary
const getSummary = async (req, res) => {
  try {
    const [[activeOrgans]]  = await pool.query("SELECT COUNT(*) AS c FROM organs WHERE status IN ('available','offer_pending')");
    const [[waiting]]       = await pool.query("SELECT COUNT(*) AS c FROM recipients WHERE status='waiting'");
    const [[pendingOffers]] = await pool.query("SELECT COUNT(*) AS c FROM offers WHERE status='pending'");
    const [[s1a]]           = await pool.query("SELECT COUNT(*) AS c FROM recipients WHERE medical_urgency='status_1a' AND status='waiting'");
    const [[s1b]]           = await pool.query("SELECT COUNT(*) AS c FROM recipients WHERE medical_urgency='status_1b' AND status='waiting'");
    const [[transplants]]   = await pool.query("SELECT COUNT(*) AS c FROM transplant_records");
    const [[donors]]        = await pool.query("SELECT COUNT(*) AS c FROM donors");
    return res.status(200).json({
      active_organs:       activeOrgans.c,
      waiting_recipients:  waiting.c,
      pending_offers:      pendingOffers.c,
      status_1a:           s1a.c,
      status_1b:           s1b.c,
      total_donors:        donors.c,
      total_transplants:   transplants.c,
    });
  } catch (err) {
    console.error('getSummary error:', err);
    return res.status(500).json({ error: 'Failed to fetch analytics summary.: ' + err.message });
  }
};

// GET /api/analytics/trends
const getTrends = async (req, res) => {
  try {
    // Safe individual queries — each has its own fallback
    let daily = [], donorRows = [], organCounts = [];

    try {
      [daily] = await pool.query(
        `SELECT DATE_FORMAT(transplant_date,'%d %b') AS label, COUNT(*) AS transplants
         FROM transplant_records
         WHERE transplant_date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
         GROUP BY transplant_date ORDER BY transplant_date ASC`
      );
    } catch(e) { console.warn('trends transplant query failed:', e.message); }

    try {
      [donorRows] = await pool.query(
        `SELECT DATE_FORMAT(DATE(created_at),'%d %b') AS label, COUNT(*) AS donors
         FROM donors
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)
         GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC`
      );
    } catch(e) { console.warn('trends donor query failed:', e.message); }

    try {
      [organCounts] = await pool.query(
        `SELECT o.organ_type, COUNT(*) AS count
         FROM transplant_records tr JOIN organs o ON tr.organ_id = o.organ_id
         GROUP BY o.organ_type ORDER BY count DESC`
      );
      if (!organCounts.length) {
        [organCounts] = await pool.query(
          `SELECT organ_type, COUNT(*) AS count FROM organs GROUP BY organ_type ORDER BY count DESC`
        );
      }
    } catch(e) { console.warn('trends organCounts query failed:', e.message); }

    const trend = daily.map(d => ({
      label:       d.label,
      transplants: d.transplants,
      donors:      donorRows.find(x => x.label === d.label)?.donors || 0,
    }));

    return res.status(200).json({ daily_trend: trend, organ_counts: organCounts });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch trends: ' + err.message });
  }
};

// GET /api/analytics/full  — used by Analytics page
const getFull = async (req, res) => {
  try {
    // Summary stats
    const [[activeOrgans]]  = await pool.query("SELECT COUNT(*) AS c FROM organs WHERE status IN ('available','offer_pending')");
    const [[waiting]]       = await pool.query("SELECT COUNT(*) AS c FROM recipients WHERE status='waiting'");
    const [[transplants]]   = await pool.query("SELECT COUNT(*) AS c FROM transplant_records");
    const [[s1a]]           = await pool.query("SELECT COUNT(*) AS c FROM recipients WHERE medical_urgency='status_1a' AND status='waiting'");
    const [[s1b]]           = await pool.query("SELECT COUNT(*) AS c FROM recipients WHERE medical_urgency='status_1b' AND status='waiting'");
    const [[s2]]            = await pool.query("SELECT COUNT(*) AS c FROM recipients WHERE medical_urgency='status_2' AND status='waiting'");
    const [[s3]]            = await pool.query("SELECT COUNT(*) AS c FROM recipients WHERE medical_urgency='status_3' AND status='waiting'");
    const [[avgScore]]      = await pool.query("SELECT ROUND(AVG(total_score),1) AS v FROM match_results WHERE status='pending'");

    const summary = {
      active_organs:      activeOrgans.c,
      total_waiting:      waiting.c,
      total_transplants:  transplants.c,
      total_1a:           s1a.c,
      total_1b:           s1b.c,
      total_2:            s2.c,
      total_3:            s3.c,
      avg_match_score:    avgScore.v,
    };

    // Top 5 hospitals by transplant volume
    const [topHospitals] = await pool.query(`
      SELECT h.name, h.hospital_id, COUNT(*) AS transplants,
             ROUND(IFNULL(SUM(tr.graft_status='functioning')/NULLIF(COUNT(*),0)*100, 0), 1) AS success_rate
      FROM transplant_records tr
      JOIN hospitals h ON tr.recipient_hospital_id = h.hospital_id
      GROUP BY h.hospital_id, h.name
      ORDER BY transplants DESC LIMIT 5
    `);

    return res.status(200).json({ summary, top_hospitals: topHospitals });
  } catch (err) {
    console.error('getFull error:', err);
    return res.status(500).json({ error: 'Failed to fetch full analytics.: ' + err.message });
  }
};

// GET /api/analytics/matching-kpis  — used by Matching Engine page
const getMatchingKpis = async (req, res) => {
  try {
    const [[avail]] = await pool.query("SELECT COUNT(*) AS c FROM organs WHERE status='available'");
    const [[total]] = await pool.query("SELECT COUNT(*) AS c FROM match_results WHERE status='pending'");
    const [[feas]]  = await pool.query("SELECT COUNT(*) AS c FROM match_results WHERE status='pending' AND ischemic_time_feasible=1");
    const [[score]] = await pool.query("SELECT ROUND(AVG(total_score),1) AS avg, ROUND(MAX(total_score),1) AS top FROM match_results WHERE status='pending'");
    const matchRate = total.c > 0 ? Math.round((feas.c / total.c) * 100) : 0;
    return res.status(200).json({
      available_organs: avail.c,
      total_candidates: total.c,
      feasible_matches: feas.c,
      match_rate:       `${matchRate}%`,
      avg_score:        score.avg || 0,
      top_score:        score.top || 0,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch matching KPIs.: ' + err.message });
  }
};

// GET /api/analytics/transplant-summary
const getTransplantSummary = async (req, res) => {
  try {
    const [[totals]] = await pool.query(`
      SELECT COUNT(*) AS total,
             ROUND(IFNULL(SUM(graft_status='functioning')/NULLIF(COUNT(*),0)*100, 0), 1) AS survival_rate,
             ROUND(IFNULL(AVG(cold_ischemia_hrs), 0), 1) AS avg_ischemic_hours,
             IFNULL(SUM(graft_status IN ('failed','patient_died')), 0) AS graft_failures
      FROM transplant_records
    `);
    const [byOrgan] = await pool.query(`
      SELECT o.organ_type, COUNT(*) AS count,
             SUM(tr.graft_status='functioning') AS successful
      FROM transplant_records tr
      JOIN organs o ON tr.organ_id = o.organ_id
      GROUP BY o.organ_type
    `);
    return res.status(200).json({
      total:              totals.total || 0,
      survival_rate:      totals.survival_rate,
      avg_ischemic_hours: totals.avg_ischemic_hours,
      graft_failures:     totals.graft_failures || 0,
      by_organ:           byOrgan,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch transplant summary.: ' + err.message });
  }
};

// GET /api/analytics/waiting-list-counts
const getWaitingListCounts = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT organ_needed AS organ_type,
             COUNT(*) AS count,
             ROUND(AVG(TIMESTAMPDIFF(MONTH, registration_date, NOW())),0) AS avg_wait,
             SUM(medical_urgency='status_1a') AS critical
      FROM recipients WHERE status='waiting'
      GROUP BY organ_needed
    `);
    const counts = {};
    rows.forEach(r => {
      counts[r.organ_type]               = r.count;
      counts[`${r.organ_type}_avg_wait`] = r.avg_wait || 0;
      counts[`${r.organ_type}_critical`] = r.critical || 0;
    });
    return res.status(200).json({ counts, by_organ: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch waiting list counts.: ' + err.message });
  }
};

module.exports = {
  getSummary, getTrends, getFull,
  getMatchingKpis, getTransplantSummary, getWaitingListCounts,
};