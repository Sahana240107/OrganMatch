const express  = require('express');
const router   = express.Router();
const {
  createDonor, getDonors,
  createOrgan, getAvailableOrgans, updateOrganStatus
} = require('../controllers/donor.controller');
const { validate, donorSchema } = require('../middleware/validate.middleware');
const { auditLog } = require('../middleware/audit.middleware');

// Donor routes
router.get('/',    getDonors);
router.post('/',   validate(donorSchema), auditLog('donor_create'), createDonor);

// Organ sub-routes (note: specific routes before param routes)
router.get('/organs/available',    getAvailableOrgans);
router.post('/organs',             auditLog('organ_create'), createOrgan);
router.patch('/organs/:id/status', auditLog('organ_status_update'), updateOrganStatus);

module.exports = router;