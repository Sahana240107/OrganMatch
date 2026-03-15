// Key change: column is recipient_user_id (FK to users), NOT recipient_id
// Also: related_organ_id and related_offer_id instead of organ_id and offer_id

const pool = require('../config/db');

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT notification_id, type, title, body,
              related_organ_id, related_offer_id,
              is_read, sent_sms, sent_email, created_at
       FROM notifications
       WHERE recipient_user_id = ? AND is_read = 0
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.user_id]
    );
    return res.status(200).json({ data: rows, count: rows.length });
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
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
    return res.status(200).json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('markRead error:', err);
    return res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
};

module.exports = { getNotifications, markRead };