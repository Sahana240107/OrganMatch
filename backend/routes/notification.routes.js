const express = require('express');
const router  = express.Router();
const { getNotifications, markRead, markAllRead } = require('../controllers/notification.controller');

router.get('/',             getNotifications);
router.patch('/read-all',   markAllRead);       // ← must be BEFORE /:id/read
router.patch('/:id/read',   markRead);

module.exports = router;