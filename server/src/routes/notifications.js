import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/notifications - List user's notifications + unread count
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const notifsRes = await query(
      `SELECT id, user_id, title, message, type, link, read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 40`,
      [userId]
    );

    const unreadCount = notifsRes.rows.filter((n) => !n.read).length;

    return res.json({
      notifications: notifsRes.rows,
      unreadCount,
    });
  } catch (err) {
    console.error('[Get Notifications Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

// PATCH /api/notifications/:id/read - Mark single as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await query(
      `UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('[Mark Notification Read Error]:', err);
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// POST /api/notifications/mark-all-read - Mark all as read
router.post('/mark-all-read', async (req, res) => {
  try {
    const userId = req.user.id;

    await query(
      `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
      [userId]
    );

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('[Mark All Read Error]:', err);
    return res.status(500).json({ error: 'Failed to mark notifications read.' });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await query(`DELETE FROM notifications WHERE id = $1 AND user_id = $2`, [id, userId]);
    return res.json({ success: true });
  } catch (err) {
    console.error('[Delete Notification Error]:', err);
    return res.status(500).json({ error: 'Failed to delete notification.' });
  }
});

export default router;

