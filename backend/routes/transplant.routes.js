const express = require('express');
const router  = express.Router();
const { getTransplants } = require('../controllers/transplant.controller');

router.get('/', getTransplants);

module.exports = router;