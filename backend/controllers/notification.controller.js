const pool = require('../config/db');
const { sendNotificationEmail } = require('../services/email.service');

// GET /api/notifications — paginated
const getNotifications = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const [[{ unread_count }]] = await pool.query(
      'SELECT COUNT(*) AS unread_count FROM notifications WHERE recipient_user_id = ? AND is_read = 0',
      [req.user.user_id]
    );
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM notifications WHERE recipient_user_id = ?',
      [req.user.user_id]
    );
    const [rows] = await pool.query(
      `SELECT notification_id, type, title, body,
              related_organ_id, related_offer_id,
              is_read, sent_email, created_at
       FROM notifications
       WHERE recipient_user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.user_id, parseInt(limit), offset]
    );
    return res.status(200).json({ notifications: rows, unread_count, total, page: parseInt(page), has_more: offset + rows.length < total });
  } catch (err) {
    console.error('getNotifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
};

// PATCH /api/notifications/:id/read
const markRead = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND recipient_user_id = ?',
      [id, req.user.user_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found.' });
    return res.status(200).json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('markRead error:', err);
    return res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
};

// PATCH /api/notifications/read-all
const markAllRead = async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE recipient_user_id = ? AND is_read = 0',
      [req.user.user_id]
    );
    return res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('markAllRead error:', err);
    return res.status(500).json({ error: 'Failed to mark all as read.' });
  }
};

// Internal helper — called from offer.controller.js and donor.controller.js
const createAndEmailNotification = async (notifList) => {
  if (!notifList || notifList.length === 0) return;
  try {
    const values = notifList.map(n => [
      n.user_id, n.type, n.title, n.body,
      n.related_organ_id || null, n.related_offer_id || null,
      0, 0   // is_read=0, sent_email=0
    ]);
    await pool.query(
      `INSERT INTO notifications
         (recipient_user_id, type, title, body, related_organ_id, related_offer_id, is_read, sent_email)
       VALUES ?`,
      [values]
    );
    const userIds = [...new Set(notifList.map(n => n.user_id))];
    const [users] = await pool.query(
      'SELECT user_id, email, full_name FROM users WHERE user_id IN (?) AND is_active = 1',
      [userIds]
    );
    const userMap = {};
    users.forEach(u => { userMap[u.user_id] = u; });

    await Promise.allSettled(
      notifList.map(async (n) => {
        const user = userMap[n.user_id];
        if (!user?.email) return;
        await sendNotificationEmail(user.email, n.title, n.body, n.type);
        await pool.query(
          `UPDATE notifications SET sent_email = 1
           WHERE recipient_user_id = ? AND type = ? AND title = ?
           ORDER BY created_at DESC LIMIT 1`,
          [n.user_id, n.type, n.title]
        );
      })
    );
  } catch (err) {
    console.error('createAndEmailNotification error:', err);
  }
};

module.exports = { getNotifications, markRead, markAllRead, createAndEmailNotification };