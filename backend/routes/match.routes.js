const express = require('express');
const router  = express.Router();
const { getMatches, runMatching, getRecentMatches, getKpis, getScoringWeights, getHlaStats } = require('../controllers/match.controller');

// FIX: Added /kpis, /scoring-weights/:organ_type, /hla-stats — all missing from original
router.get('/kpis',                        getKpis);
router.get('/scoring-weights/:organ_type', getScoringWeights);
router.get('/hla-stats',                   getHlaStats);
router.get('/recent',                   getRecentMatches);
router.get('/:organ_id',                getMatches);
router.post('/:organ_id/run',           runMatching);

module.exports = router;