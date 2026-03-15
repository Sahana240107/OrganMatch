// controllers/analytics.controller.js
// GET /api/analytics/summary — national_admin only
// Uses the vw_analytics_summary view created by M1

const pool = require('../config/db');

const getSummary = async (req, res) => {
  try {
    // Try the view first, fall back to direct aggregation
    let summary;
    try {
      const [viewRows] = await pool.query('SELECT * FROM vw_analytics_summary LIMIT 1');
      summary = viewRows[0] || null;
    } catch {
      summary = null; // view may not exist yet
    }

    // Direct aggregation fallback
    const [donorCount]      = await pool.query('SELECT COUNT(*) AS total FROM donors');
    const [recipientCount]  = await pool.query("SELECT COUNT(*) AS total FROM recipients WHERE status = 'waiting'");
    const [availableOrgans] = await pool.query("SELECT COUNT(*) AS total FROM organs WHERE status = 'available'");
    const [transplantCount] = await pool.query('SELECT COUNT(*) AS total FROM transplant_records');
    const [offerStats]      = await pool.query(`
      SELECT
        SUM(status = 'pending')  AS pending_offers,
        SUM(status = 'accepted') AS accepted_offers,
        SUM(status = 'declined') AS declined_offers,
        SUM(status = 'expired')  AS expired_offers
      FROM offers
    `);
    const [byOrganType] = await pool.query(`
  SELECT o.organ_type, COUNT(*) AS count
  FROM transplant_records tr
  JOIN organs o ON tr.organ_id = o.organ_id
  GROUP BY o.organ_type
  ORDER BY count DESC
`);
    const [avgWait] = await pool.query(`
      SELECT organ_needed,
             AVG(TIMESTAMPDIFF(DAY, registration_date, NOW())) AS avg_wait_days
      FROM recipients
      WHERE status = 'waiting'
      GROUP BY organ_needed
    `);

    return res.status(200).json({
      data: {
        summary,
        total_donors:            donorCount[0].total,
        recipients_waiting:      recipientCount[0].total,
        organs_available:        availableOrgans[0].total,
        total_transplants:       transplantCount[0].total,
        offer_stats:             offerStats[0],
        transplants_by_organ:    byOrganType,
        avg_wait_days_by_organ:  avgWait
      }
    });
  } catch (err) {
    console.error('getSummary error:', err);
    return res.status(500).json({ error: 'Failed to fetch analytics summary.' });
  }
};

module.exports = { getSummary };