const pool = require('../config/db');
const { broadcast } = require('../websocket/notifier');

// GET /api/matches/:organ_id  — uses vw_match_results_detail view
const getMatches = async (req, res) => {
  const { organ_id } = req.params;

  try {
    const [rows] = await pool.query(`
      SELECT match_id, organ_id, organ_type,
             donor_blood, donor_hospital, donor_city,
             recipient_id, recipient_name, recipient_blood,
             medical_urgency, recipient_hospital, recipient_city,
             hla_antigen_matches,
             score_hla, score_abo, score_urgency, score_wait_time,
             score_distance, score_pra,
             total_score, distance_km, estimated_transport_hrs,
             ischemic_time_feasible, rank_position, status, computed_at
      FROM vw_match_results_detail
      WHERE organ_id = ? AND ischemic_time_feasible = 1
      ORDER BY rank_position ASC
    `, [organ_id]);

    return res.status(200).json({ data: rows, count: rows.length });
  } catch (err) {
    console.error('getMatches error:', err);
    return res.status(500).json({ error: 'Failed to fetch match results.' });
  }
};

// POST /api/matches/:organ_id/run  — manually re-trigger match_organ() SP
const runMatching = async (req, res) => {
  const { organ_id } = req.params;

  try {
    const [organRows] = await pool.query(
      'SELECT organ_id, organ_type, status FROM organs WHERE organ_id = ?', [organ_id]
    );
    if (organRows.length === 0) return res.status(404).json({ error: 'Organ not found.' });
    if (organRows[0].status !== 'available') {
      return res.status(409).json({ error: `Organ is not available (status: ${organRows[0].status}).` });
    }

    await pool.query('CALL match_organ(?)', [organ_id]);

    const [[{ match_count }]] = await pool.query(
      'SELECT COUNT(*) AS match_count FROM match_results WHERE organ_id = ? AND ischemic_time_feasible = 1',
      [organ_id]
    );

    broadcast('match_completed', { organ_id: Number(organ_id), match_count });

    return res.status(200).json({
      message: `Matching complete. ${match_count} feasible matches found.`,
      data: { organ_id: Number(organ_id), match_count }
    });
  } catch (err) {
    console.error('runMatching error:', err);
    if (err.code === 'ER_SP_DOES_NOT_EXIST') {
      return res.status(503).json({ error: 'match_organ() SP not found. Run organmatch_complete.sql first.' });
    }
    return res.status(500).json({ error: 'Failed to run matching algorithm.' });
  }
};

const getRecentMatches = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT mr.match_id, mr.organ_id, mr.recipient_id, mr.total_score,
             mr.rank_position, mr.status, mr.computed_at,
             o.organ_type, d.donor_id,
             r.medical_urgency,
             h.name AS hospital
      FROM match_results mr
      JOIN organs     o  ON mr.organ_id     = o.organ_id
      JOIN donors     d  ON o.donor_id      = d.donor_id
      JOIN recipients r  ON mr.recipient_id = r.recipient_id
      JOIN hospitals  h  ON r.hospital_id   = h.hospital_id
      WHERE mr.rank_position = 1
      ORDER BY mr.computed_at DESC
      LIMIT 10
    `);
    return res.status(200).json({ matches: rows });
  } catch (err) {
    console.error('getRecentMatches error:', err);
    return res.status(500).json({ error: 'Failed to fetch recent matches.' });
  }
};

module.exports = { getMatches, runMatching, getRecentMatches };