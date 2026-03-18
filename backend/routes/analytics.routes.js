const express = require('express');
const router  = express.Router();
const {
  getSummary, getTrends, getFull,
  getMatchingKpis, getTransplantSummary, getWaitingListCounts,
} = require('../controllers/analytics.controller');

router.get('/summary',             getSummary);
router.get('/trends',              getTrends);
router.get('/full',                getFull);
router.get('/matching-kpis',       getMatchingKpis);   // used by old MatchingEngine
router.get('/transplant-summary',  getTransplantSummary);
router.get('/waiting-list-counts', getWaitingListCounts);

module.exports = router;
