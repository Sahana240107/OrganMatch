const express = require('express');
const router  = express.Router();
const { getHospitals, getCapabilities, getBloodBank } = require('../controllers/hospital.controller');

router.get('/',                        getHospitals);
router.get('/:id/capabilities',        getCapabilities);
router.get('/:id/blood-bank',          getBloodBank);

module.exports = router;