const express = require('express');
const router  = express.Router();
const {
  getMatches, getMatchesForRecipient, runMatchingForRecipient,
  runMatching, getRecentMatches, getKpis, getScoringWeights, getHlaStats,
} = require('../controllers/match.controller');

// ── Static named routes MUST come before /:param routes ──────────────────────
router.get('/kpis',                            getKpis);
router.get('/scoring-weights/:organ_type',     getScoringWeights);
router.get('/hla-stats',                       getHlaStats);
router.get('/recent',                          getRecentMatches);

// ── Recipient-centric matching (new — "find donors for this patient") ─────────
router.get('/for-recipient/:recipient_id',      getMatchesForRecipient);
router.post('/for-recipient/:recipient_id/run', runMatchingForRecipient);

// ── Organ-centric (kept for backward compat) ──────────────────────────────────
router.get('/:organ_id',      getMatches);
router.post('/:organ_id/run', runMatching);

module.exports = router;