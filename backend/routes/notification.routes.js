const express = require('express');
const router  = express.Router();
const { getNotifications, markRead } = require('../controllers/notification.controller');

router.get('/',               getNotifications);
router.patch('/:id/read',     markRead);

module.exports = router;