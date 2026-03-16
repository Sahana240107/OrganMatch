const express  = require('express');
const router   = express.Router();
const { sendOffer, acceptOffer, declineOffer, getPendingOffers, getOffersByOrgan } = require('../controllers/offer.controller');
const { auditLog } = require('../middleware/audit.middleware');

router.get('/',                getPendingOffers);     // GET /api/offers?organ_id=X or all pending
router.get('/pending',         getPendingOffers);
router.post('/',               auditLog('offer_send'),    sendOffer);
router.post('/:id/accept',     auditLog('offer_accept'),  acceptOffer);
router.post('/:id/decline',    auditLog('offer_decline'), declineOffer);
router.patch('/:id/accept',    auditLog('offer_accept'),  acceptOffer);   // frontend uses PATCH
router.patch('/:id/decline',   auditLog('offer_decline'), declineOffer);  // frontend uses PATCH

module.exports = router;