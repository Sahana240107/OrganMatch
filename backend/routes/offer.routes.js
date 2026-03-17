const express  = require('express');
const router   = express.Router();
const {
  sendOffer, acceptOffer, declineOffer,
  getPendingOffers, getOffersByOrgan, getRecentOffers
} = require('../controllers/offer.controller');
const { auditLog } = require('../middleware/audit.middleware');

router.get('/pending',       getPendingOffers);
router.get('/recent',        getRecentOffers);    // ← NEW: shows all offers incl. seed data
router.get('/',              getOffersByOrgan);
router.post('/',             auditLog('offer_send'),    sendOffer);
router.post('/:id/accept',   auditLog('offer_accept'),  acceptOffer);
router.post('/:id/decline',  auditLog('offer_decline'), declineOffer);
router.patch('/:id/accept',  auditLog('offer_accept'),  acceptOffer);
router.patch('/:id/decline', auditLog('offer_decline'), declineOffer);

module.exports = router;