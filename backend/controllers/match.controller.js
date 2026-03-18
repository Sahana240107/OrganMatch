const pool = require('../config/db');
const { broadcast } = require('../websocket/notifier');

// GET /api/matches/:organ_id
// Returns ranked match results for a given organ, with full score breakdown
const getMatches = async (req, res) => {
  const { organ_id } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT
        mr.match_id,
        mr.organ_id,
        o.organ_type,
        o.viability_hours,
        o.expires_at,
        -- Donor
        d.donor_id,
        d.full_name        AS donor_name,
        d.blood_group      AS donor_blood,
        d.age              AS donor_age,
        dh.name            AS donor_hospital,
        dh.city            AS donor_city,
        -- Recipient
        r.recipient_id,
        r.full_name        AS recipient_name,
        r.blood_group      AS recipient_blood,
        r.age              AS recipient_age,
        r.medical_urgency,
        r.pra_percent,
        r.registration_date,
        rh.name            AS recipient_hospital,
        rh.city            AS recipient_city,
        -- HLA typing (donor)
        dht.hla_a1 AS donor_hla_a1, dht.hla_a2 AS donor_hla_a2,
        dht.hla_b1 AS donor_hla_b1, dht.hla_b2 AS donor_hla_b2,
        dht.hla_dr1 AS donor_hla_dr1, dht.hla_dr2 AS donor_hla_dr2,
        -- HLA typing (recipient)
        rht.hla_a1 AS recip_hla_a1, rht.hla_a2 AS recip_hla_a2,
        rht.hla_b1 AS recip_hla_b1, rht.hla_b2 AS recip_hla_b2,
        rht.hla_dr1 AS recip_hla_dr1, rht.hla_dr2 AS recip_hla_dr2,
        -- Score components from breakdown table
        COALESCE(msb.score_hla,       0) AS score_hla,
        COALESCE(msb.score_abo,       0) AS score_abo,
        COALESCE(msb.score_urgency,   0) AS score_urgency,
        COALESCE(msb.score_wait_time, 0) AS score_wait_time,
        COALESCE(msb.score_distance,  0) AS score_distance,
        COALESCE(msb.score_pra,       0) AS score_pra,
        COALESCE(msb.score_age,       0) AS score_age,
        -- Match result metadata
        mr.hla_antigen_matches,
        mr.total_score,
        mr.distance_km,
        mr.estimated_transport_hrs,
        mr.ischemic_time_feasible,
        mr.rank_position,
        mr.status,
        mr.computed_at
      FROM match_results mr
      JOIN organs      o   ON mr.organ_id             = o.organ_id
      JOIN donors      d   ON o.donor_id              = d.donor_id
      JOIN hospitals   dh  ON mr.donor_hospital_id    = dh.hospital_id
      JOIN recipients  r   ON mr.recipient_id         = r.recipient_id
      JOIN hospitals   rh  ON mr.recipient_hospital_id = rh.hospital_id
      LEFT JOIN match_score_breakdown msb ON msb.match_id = mr.match_id
      LEFT JOIN donor_hla_typing     dht ON dht.donor_id     = d.donor_id
      LEFT JOIN recipient_hla_typing rht ON rht.recipient_id = r.recipient_id
      WHERE mr.organ_id = ? AND mr.ischemic_time_feasible = 1
      ORDER BY mr.rank_position ASC
      LIMIT 50
    `, [organ_id]);

    return res.status(200).json({ data: rows, count: rows.length });
  } catch (err) {
    console.error('getMatches error:', err);
    return res.status(500).json({ error: 'Failed to fetch match results: ' + err.message });
  }
};

// POST /api/matches/:organ_id/run
const runMatching = async (req, res) => {
  const { organ_id } = req.params;
  try {
    const [organRows] = await pool.query(
      'SELECT organ_id, organ_type, status, viability_hours, expires_at FROM organs WHERE organ_id = ?',
      [organ_id]
    );
    if (!organRows.length) return res.status(404).json({ error: 'Organ not found.' });
    const organ = organRows[0];
    if (organ.status !== 'available') {
      return res.status(409).json({ error: `Organ is not available for matching (status: ${organ.status}).` });
    }
    await pool.query('CALL match_organ(?)', [organ_id]);
    const [[counts]] = await pool.query(
      `SELECT COUNT(*) AS total_candidates,
              SUM(ischemic_time_feasible) AS feasible_count,
              ROUND(MAX(total_score),1)   AS top_score,
              ROUND(AVG(total_score),1)   AS avg_score
       FROM match_results WHERE organ_id = ?`,
      [organ_id]
    );
    broadcast('match_completed', {
      organ_id:         Number(organ_id),
      organ_type:       organ.organ_type,
      feasible_count:   Number(counts.feasible_count || 0),
      total_candidates: Number(counts.total_candidates || 0),
      top_score:        String(counts.top_score || 0),
    });
    return res.status(200).json({
      message: `Matching complete. ${counts.feasible_count || 0} feasible, ${counts.total_candidates || 0} total candidates scored.`,
      data: {
        organ_id:         Number(organ_id),
        organ_type:       organ.organ_type,
        feasible_count:   Number(counts.feasible_count || 0),
        total_candidates: Number(counts.total_candidates || 0),
        top_score:        String(counts.top_score || 0),
        avg_score:        String(counts.avg_score || 0),
      }
    });
  } catch (err) {
    console.error('runMatching error:', err);
    if (err.code === 'ER_SP_DOES_NOT_EXIST') {
      return res.status(503).json({ error: 'match_organ() stored procedure not found. Run m3_matching_engine.sql.' });
    }
    return res.status(500).json({ error: err.message || 'Failed to run matching.' });
  }
};

// GET /api/matches/recent
const getRecentMatches = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT mr.match_id, mr.organ_id, mr.recipient_id,
             mr.total_score, mr.hla_antigen_matches,
             mr.ischemic_time_feasible, mr.rank_position,
             mr.status, mr.computed_at,
             o.organ_type,
             d.blood_group AS donor_blood,
             r.full_name   AS recipient_name,
             r.medical_urgency,
             r.blood_group AS recipient_blood,
             rh.name       AS hospital
      FROM match_results mr
      JOIN organs     o  ON mr.organ_id     = o.organ_id
      JOIN donors     d  ON o.donor_id      = d.donor_id
      JOIN recipients r  ON mr.recipient_id = r.recipient_id
      JOIN hospitals  rh ON r.hospital_id   = rh.hospital_id
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

// GET /api/matches/kpis
const getKpis = async (req, res) => {
  try {
    const [[avail]]  = await pool.query("SELECT COUNT(*) AS c FROM organs WHERE status='available'");
    const [[total]]  = await pool.query("SELECT COUNT(*) AS c FROM match_results WHERE status='pending'");
    const [[feas]]   = await pool.query("SELECT COUNT(*) AS c FROM match_results WHERE status='pending' AND ischemic_time_feasible=1");
    const [[score]]  = await pool.query("SELECT ROUND(AVG(total_score),1) AS avg, ROUND(MAX(total_score),1) AS top FROM match_results WHERE status='pending'");
    const matchRate  = total.c > 0 ? Math.round((feas.c / total.c) * 100) : 0;
    return res.status(200).json({
      available_organs: avail.c,
      total_candidates: total.c,
      feasible_matches: feas.c,
      match_rate:       `${matchRate}%`,
      avg_score:        score.avg || 0,
      top_score:        score.top || 0,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch matching KPIs.' });
  }
};

// GET /api/matches/scoring-weights/:organ_type
const getScoringWeights = async (req, res) => {
  const { organ_type } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM organ_match_weights WHERE organ_type = ? LIMIT 1', [organ_type]
    );
    if (!rows.length) return res.status(404).json({ error: 'Weights not found for this organ type.' });
    return res.status(200).json({ weights: rows[0] });
  } catch (err) {
    console.error('getScoringWeights error (non-fatal):', err.message);
    return res.status(500).json({ error: 'Failed to fetch scoring weights.' });
  }
};

// GET /api/matches/hla-stats
const getHlaStats = async (req, res) => {
  try {
    const [distribution] = await pool.query(`
      SELECT hla_antigen_matches AS matches,
             COUNT(*) AS count,
             ROUND(AVG(total_score),1) AS avg_score
      FROM match_results
      WHERE status IN ('pending','offer_sent','accepted')
      GROUP BY hla_antigen_matches
      ORDER BY hla_antigen_matches DESC
    `);
    return res.status(200).json({ distribution });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch HLA stats.' });
  }
};

module.exports = { getMatches, runMatching, getRecentMatches, getKpis, getScoringWeights, getHlaStats };
