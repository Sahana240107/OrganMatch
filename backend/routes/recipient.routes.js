const express  = require('express');
const router   = express.Router();
const { createRecipient, getRecipients, getWaitingList, updateUrgency, getRecipientById } = require('../controllers/recipient.controller');
const { validate, recipientSchema } = require('../middleware/validate.middleware');
const { auditLog } = require('../middleware/audit.middleware');

router.get('/',               getRecipients);
router.post('/',              validate(recipientSchema), auditLog('recipient_create'), createRecipient);
router.get('/waiting-list',   getWaitingList);
router.get('/:id',            getRecipientById);          // ← NEW: single recipient
router.patch('/:id/urgency',  auditLog('recipient_urgency_update'), updateUrgency);

module.exports = router;