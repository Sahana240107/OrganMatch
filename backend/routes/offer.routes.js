const express  = require('express');
const router   = express.Router();
const {
  sendOffer, acceptOffer, declineOffer,
  getPendingOffers, getOffersByOrgan, getRecentOffers, getCascade,
} = require('../controllers/offer.controller');
const { auditLog } = require('../middleware/audit.middleware');

// FIX: /recent must come before /:id routes to avoid being swallowed as an id param
router.get('/pending',         getPendingOffers);
router.get('/recent',          getRecentOffers);
// FIX: GET / with no organ_id now returns recent offers (all statuses) so OfferWorkflow shows history
router.get('/',                getRecentOffers);
router.post('/',               auditLog('offer_send'),    sendOffer);
// FIX: Added /:id/cascade route — OfferWorkflow calls this to build the timeline panel
router.get('/:id/cascade',     getCascade);
router.post('/:id/accept',     auditLog('offer_accept'),  acceptOffer);
router.post('/:id/decline',    auditLog('offer_decline'), declineOffer);
router.patch('/:id/accept',    auditLog('offer_accept'),  acceptOffer);
router.patch('/:id/decline',   auditLog('offer_decline'), declineOffer);

module.exports = router;