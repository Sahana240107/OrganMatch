const express = require('express');
const router  = express.Router();
const { getHospitals, getCapabilities, getBloodBank, getNetwork } = require('../controllers/hospital.controller');

router.get('/',                  getHospitals);
router.get('/network',           getNetwork);          // NEW
router.get('/:id/capabilities',  getCapabilities);
router.get('/:id/blood-bank',    getBloodBank);

module.exports = router;