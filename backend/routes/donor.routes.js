const express = require('express');
const router  = express.Router();
const {
  createDonor, getDonors, withdrawDonor,
  createOrgan, getAvailableOrgans, updateOrganStatus, getOrgansByStatus
} = require('../controllers/donor.controller');
const { validate, donorSchema } = require('../middleware/validate.middleware');
const { auditLog } = require('../middleware/audit.middleware');

router.get('/',                    getDonors);
router.post('/',                   validate(donorSchema), auditLog('donor_create'), createDonor);

// FIX: withdrawDonor was exported from controller but never registered as a route
router.delete('/:id',              auditLog('donor_withdraw'), withdrawDonor);

router.get('/organs/available',    getAvailableOrgans);
router.get('/organs',              getOrgansByStatus);       // handles ?status=available
router.post('/organs',             auditLog('organ_create'), createOrgan);
router.patch('/organs/:id/status', auditLog('organ_status_update'), updateOrganStatus);

module.exports = router;