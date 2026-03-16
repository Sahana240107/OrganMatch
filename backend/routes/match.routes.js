const express = require('express');
const router  = express.Router();
const { getMatches, runMatching, getRecentMatches } = require('../controllers/match.controller');

router.get('/recent',        getRecentMatches);   // NEW
router.get('/:organ_id',     getMatches);
router.post('/:organ_id/run', runMatching);

module.exports = router;