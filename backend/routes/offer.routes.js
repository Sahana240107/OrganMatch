const express  = require('express');
const router   = express.Router();
const { sendOffer, acceptOffer, declineOffer } = require('../controllers/offer.controller');
const { auditLog } = require('../middleware/audit.middleware');

router.post('/',              auditLog('offer_send'),    sendOffer);
router.post('/:id/accept',    auditLog('offer_accept'),  acceptOffer);
router.post('/:id/decline',   auditLog('offer_decline'), declineOffer);

module.exports = router;