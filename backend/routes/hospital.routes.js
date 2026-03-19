const express = require('express');
const router  = express.Router();
const { getHospitals, getCapabilities, getBloodBank, getNetwork, createHospital, createCapability, createBloodBankEntry } = require('../controllers/hospital.controller');

router.get('/',                  getHospitals);
router.post('/',                 createHospital);
router.get('/network',           getNetwork);
router.get('/:id/capabilities',  getCapabilities);
router.post('/:id/capabilities', createCapability);       // NEW
router.get('/:id/blood-bank',    getBloodBank);
router.post('/:id/blood-bank',   createBloodBankEntry);   // NEW

module.exports = router;