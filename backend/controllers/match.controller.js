const pool = require('../config/db');
const { broadcast } = require('../websocket/notifier');

// GET /api/matches/:organ_id — given an organ, return ranked recipients (organ-centric, kept for compat)
const getMatches = async (req, res) => {
  const { organ_id } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT
        mr.match_id, mr.organ_id, o.organ_type, o.viability_hours, o.expires_at,
        d.donor_id, d.full_name AS donor_name, d.blood_group AS donor_blood, d.age AS donor_age,
        dh.name AS donor_hospital, dh.city AS donor_city,
        r.recipient_id, r.full_name AS recipient_name, r.blood_group AS recipient_blood,
        r.age AS recipient_age, r.medical_urgency, r.pra_percent, r.registration_date,
        rh.name AS recipient_hospital, rh.city AS recipient_city,
        dht.hla_a1 AS donor_hla_a1, dht.hla_a2 AS donor_hla_a2,
        dht.hla_b1 AS donor_hla_b1, dht.hla_b2 AS donor_hla_b2,
        dht.hla_dr1 AS donor_hla_dr1, dht.hla_dr2 AS donor_hla_dr2,
        rht.hla_a1 AS recip_hla_a1, rht.hla_a2 AS recip_hla_a2,
        rht.hla_b1 AS recip_hla_b1, rht.hla_b2 AS recip_hla_b2,
        rht.hla_dr1 AS recip_hla_dr1, rht.hla_dr2 AS recip_hla_dr2,
        COALESCE(msb.score_hla, 0) AS score_hla, COALESCE(msb.score_abo, 0) AS score_abo,
        COALESCE(msb.score_urgency, 0) AS score_urgency, COALESCE(msb.score_wait_time, 0) AS score_wait_time,
        COALESCE(msb.score_distance, 0) AS score_distance, COALESCE(msb.score_pra, 0) AS score_pra,
        COALESCE(msb.score_age, 0) AS score_age,
        mr.hla_antigen_matches, mr.total_score, mr.distance_km, mr.estimated_transport_hrs,
        mr.ischemic_time_feasible, mr.rank_position, mr.status, mr.computed_at
      FROM match_results mr
      JOIN organs      o   ON mr.organ_id              = o.organ_id
      JOIN donors      d   ON o.donor_id               = d.donor_id
      JOIN hospitals   dh  ON mr.donor_hospital_id     = dh.hospital_id
      JOIN recipients  r   ON mr.recipient_id          = r.recipient_id
      JOIN hospitals   rh  ON mr.recipient_hospital_id = rh.hospital_id
      LEFT JOIN match_score_breakdown msb ON msb.match_id    = mr.match_id
      LEFT JOIN donor_hla_typing      dht ON dht.donor_id    = d.donor_id
      LEFT JOIN recipient_hla_typing  rht ON rht.recipient_id = r.recipient_id
      WHERE mr.organ_id = ? AND mr.ischemic_time_feasible = 1
        AND r.recipient_id IN (
          SELECT MIN(r2.recipient_id) FROM recipients r2
          GROUP BY r2.full_name, r2.organ_needed, r2.blood_group
        )
      ORDER BY mr.rank_position ASC
      LIMIT 50
    `, [organ_id]);
    return res.status(200).json({ data: rows, count: rows.length });
  } catch (err) {
    console.error('getMatches error:', err);
    return res.status(500).json({ error: 'Failed to fetch match results: ' + err.message });
  }
};

// GET /api/matches/for-recipient/:recipient_id
// Given a recipient, return all available organs ranked by score for that patient.
// One row per donor — deduplicates left/right lungs (and any bilateral organ) by keeping
// the best-scoring organ per donor.
const getMatchesForRecipient = async (req, res) => {
  const { recipient_id } = req.params;
  try {
    const [[recip]] = await pool.query(
      `SELECT r.recipient_id, r.full_name, r.organ_needed, r.blood_group,
              r.medical_urgency, r.pra_percent, r.registration_date, r.hospital_id,
              h.name AS recipient_hospital, h.city AS recipient_city,
              h.latitude AS recipient_lat, h.longitude AS recipient_lon
       FROM recipients r JOIN hospitals h ON r.hospital_id = h.hospital_id
       WHERE r.recipient_id = ? LIMIT 1`,
      [recipient_id]
    );
    if (!recip) return res.status(404).json({ error: 'Recipient not found.' });

    // Auto-run matching for any available organs not yet scored for this recipient
    const [unscored] = await pool.query(
      `SELECT o.organ_id FROM organs o
       WHERE o.organ_type = ? AND o.status = 'available'
         AND o.organ_id NOT IN (
           SELECT mr.organ_id FROM match_results mr WHERE mr.recipient_id = ?
         )`,
      [recip.organ_needed, recipient_id]
    );
    for (const organ of unscored) {
      try { await pool.query('CALL match_organ(?)', [organ.organ_id]); } catch { /* non-fatal */ }
    }

    // Each row = one DONOR ranked by best score for this recipient.
    // The inner subquery picks the best match_id per donor (highest total_score),
    // so donors with both left and right lungs only appear once.
    const [rows] = await pool.query(`
      SELECT
        mr.match_id, mr.organ_id, o.organ_type, o.laterality, o.viability_hours, o.expires_at,
        ROUND(TIMESTAMPDIFF(MINUTE, NOW(), o.expires_at) / 60.0, 1) AS hours_remaining,
        d.donor_id, d.full_name AS donor_name, d.blood_group AS donor_blood, d.age AS donor_age,
        dh.name AS donor_hospital, dh.city AS donor_city,
        dh.latitude AS donor_lat, dh.longitude AS donor_lon,
        r.recipient_id, r.full_name AS recipient_name, r.blood_group AS recipient_blood,
        r.age AS recipient_age, r.medical_urgency, r.pra_percent,
        rh.name AS recipient_hospital, rh.city AS recipient_city,
        rh.latitude AS recipient_lat, rh.longitude AS recipient_lon,
        dht.hla_a1 AS donor_hla_a1, dht.hla_a2 AS donor_hla_a2,
        dht.hla_b1 AS donor_hla_b1, dht.hla_b2 AS donor_hla_b2,
        dht.hla_dr1 AS donor_hla_dr1, dht.hla_dr2 AS donor_hla_dr2,
        COALESCE(msb.score_hla, 0) AS score_hla, COALESCE(msb.score_abo, 0) AS score_abo,
        COALESCE(msb.score_urgency, 0) AS score_urgency, COALESCE(msb.score_wait_time, 0) AS score_wait_time,
        COALESCE(msb.score_distance, 0) AS score_distance, COALESCE(msb.score_pra, 0) AS score_pra,
        COALESCE(msb.score_age, 0) AS score_age,
        mr.hla_antigen_matches, mr.total_score, mr.distance_km, mr.estimated_transport_hrs,
        mr.ischemic_time_feasible, mr.status, mr.computed_at
      FROM match_results mr
      JOIN organs      o   ON mr.organ_id              = o.organ_id
      JOIN donors      d   ON o.donor_id               = d.donor_id
      JOIN hospitals   dh  ON mr.donor_hospital_id     = dh.hospital_id
      JOIN recipients  r   ON mr.recipient_id          = r.recipient_id
      JOIN hospitals   rh  ON mr.recipient_hospital_id = rh.hospital_id
      LEFT JOIN match_score_breakdown msb ON msb.match_id = mr.match_id
      LEFT JOIN donor_hla_typing      dht ON dht.donor_id = d.donor_id
      WHERE mr.recipient_id = ?
        AND o.status IN ('available', 'offer_pending')
        AND mr.ischemic_time_feasible = 1
        -- Deduplicate: for each donor keep only the match with the highest total_score.
        -- This prevents the same donor appearing twice for left + right lungs.
        AND mr.match_id = (
          SELECT mr2.match_id
          FROM match_results mr2
          JOIN organs o2 ON mr2.organ_id = o2.organ_id
          WHERE mr2.recipient_id = mr.recipient_id
            AND o2.donor_id = d.donor_id
            AND o2.status IN ('available', 'offer_pending')
            AND mr2.ischemic_time_feasible = 1
          ORDER BY mr2.total_score DESC, mr2.hla_antigen_matches DESC
          LIMIT 1
        )
      ORDER BY mr.total_score DESC, mr.hla_antigen_matches DESC
    `, [recipient_id]);

    return res.status(200).json({ recipient: recip, data: rows, count: rows.length });
  } catch (err) {
    console.error('getMatchesForRecipient error:', err);
    return res.status(500).json({ error: 'Failed to fetch donor matches: ' + err.message });
  }
};

// POST /api/matches/for-recipient/:recipient_id/run
// Re-run matching on all available organs of the recipient's needed type
const runMatchingForRecipient = async (req, res) => {
  const { recipient_id } = req.params;
  try {
    const [[recip]] = await pool.query(
      'SELECT recipient_id, organ_needed FROM recipients WHERE recipient_id = ? LIMIT 1',
      [recipient_id]
    );
    if (!recip) return res.status(404).json({ error: 'Recipient not found.' });

    const [organs] = await pool.query(
      "SELECT organ_id FROM organs WHERE organ_type = ? AND status = 'available'",
      [recip.organ_needed]
    );
    if (!organs.length) {
      return res.status(200).json({ message: `No available ${recip.organ_needed} organs to match.`, count: 0 });
    }

    let ran = 0;
    for (const organ of organs) {
      try { await pool.query('CALL match_organ(?)', [organ.organ_id]); ran++; } catch { /* non-fatal */ }
    }

    const [[counts]] = await pool.query(
      `SELECT COUNT(*) AS total, SUM(mr.ischemic_time_feasible) AS feasible,
              ROUND(MAX(mr.total_score), 1) AS top_score
       FROM match_results mr
       JOIN organs o ON mr.organ_id = o.organ_id
       WHERE mr.recipient_id = ? AND o.status IN ('available','offer_pending')`,
      [recipient_id]
    );

    broadcast('match_completed', {
      recipient_id: Number(recipient_id),
      organ_type: recip.organ_needed,
      feasible_count: Number(counts.feasible || 0),
      top_score: String(counts.top_score || 0),
    });

    return res.status(200).json({
      message: `Matching complete. ${counts.feasible || 0} compatible donor(s) found.`,
      data: {
        recipient_id: Number(recipient_id),
        organ_type: recip.organ_needed,
        organs_scored: ran,
        feasible_count: Number(counts.feasible || 0),
        top_score: String(counts.top_score || 0),
      }
    });
  } catch (err) {
    console.error('runMatchingForRecipient error:', err);
    return res.status(500).json({ error: err.message || 'Failed to run matching.' });
  }
};

// POST /api/matches/:organ_id/run  (kept for backward compat)
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
      `SELECT COUNT(*) AS total_candidates, SUM(ischemic_time_feasible) AS feasible_count,
              ROUND(MAX(total_score),1) AS top_score, ROUND(AVG(total_score),1) AS avg_score
       FROM match_results WHERE organ_id = ?`,
      [organ_id]
    );
    broadcast('match_completed', {
      organ_id: Number(organ_id), organ_type: organ.organ_type,
      feasible_count: Number(counts.feasible_count || 0),
      total_candidates: Number(counts.total_candidates || 0),
      top_score: String(counts.top_score || 0),
    });
    return res.status(200).json({
      message: `Matching complete. ${counts.feasible_count || 0} feasible, ${counts.total_candidates || 0} total candidates scored.`,
      data: {
        organ_id: Number(organ_id), organ_type: organ.organ_type,
        feasible_count: Number(counts.feasible_count || 0),
        total_candidates: Number(counts.total_candidates || 0),
        top_score: String(counts.top_score || 0),
        avg_score: String(counts.avg_score || 0),
      }
    });
  } catch (err) {
    console.error('runMatching error:', err);
    if (err.code === 'ER_SP_DOES_NOT_EXIST')
      return res.status(503).json({ error: 'match_organ() stored procedure not found. Run m3_matching_engine.sql.' });
    return res.status(500).json({ error: err.message || 'Failed to run matching.' });
  }
};

const getRecentMatches = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT mr.match_id, mr.organ_id, mr.recipient_id,
             mr.total_score, mr.hla_antigen_matches, mr.ischemic_time_feasible,
             mr.rank_position, mr.status, mr.computed_at, o.organ_type,
             d.blood_group AS donor_blood, r.full_name AS recipient_name,
             r.medical_urgency, r.blood_group AS recipient_blood, rh.name AS hospital
      FROM match_results mr
      JOIN organs     o  ON mr.organ_id     = o.organ_id
      JOIN donors     d  ON o.donor_id      = d.donor_id
      JOIN recipients r  ON mr.recipient_id = r.recipient_id
      JOIN hospitals  rh ON r.hospital_id   = rh.hospital_id
      WHERE mr.rank_position = 1
      ORDER BY mr.computed_at DESC LIMIT 10
    `);
    return res.status(200).json({ matches: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch recent matches.' });
  }
};

const getKpis = async (req, res) => {
  try {
    const [[avail]] = await pool.query("SELECT COUNT(*) AS c FROM organs WHERE status='available'");
    const [[total]] = await pool.query("SELECT COUNT(*) AS c FROM match_results WHERE status='pending'");
    const [[feas]]  = await pool.query("SELECT COUNT(*) AS c FROM match_results WHERE status='pending' AND ischemic_time_feasible=1");
    const [[score]] = await pool.query("SELECT ROUND(AVG(total_score),1) AS avg, ROUND(MAX(total_score),1) AS top FROM match_results WHERE status='pending'");
    const matchRate = total.c > 0 ? Math.round((feas.c / total.c) * 100) : 0;
    return res.status(200).json({
      available_organs: avail.c, total_candidates: total.c, feasible_matches: feas.c,
      match_rate: `${matchRate}%`, avg_score: score.avg || 0, top_score: score.top || 0,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch matching KPIs.' });
  }
};

const getScoringWeights = async (req, res) => {
  const { organ_type } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM organ_match_weights WHERE organ_type = ? LIMIT 1', [organ_type]);
    if (!rows.length) return res.status(404).json({ error: 'Weights not found for this organ type.' });
    return res.status(200).json({ weights: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch scoring weights.' });
  }
};

const getHlaStats = async (req, res) => {
  try {
    const [distribution] = await pool.query(`
      SELECT hla_antigen_matches AS matches, COUNT(*) AS count, ROUND(AVG(total_score),1) AS avg_score
      FROM match_results WHERE status IN ('pending','offer_sent','accepted')
      GROUP BY hla_antigen_matches ORDER BY hla_antigen_matches DESC
    `);
    return res.status(200).json({ distribution });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch HLA stats.' });
  }
};

module.exports = {
  getMatches, getMatchesForRecipient, runMatchingForRecipient,
  runMatching, getRecentMatches, getKpis, getScoringWeights, getHlaStats,
};