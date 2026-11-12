import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/files - List files/attachments across boards
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const filesRes = await query(
      `SELECT 
        ca.id,
        ca.name,
        ca.url,
        ca.size,
        ca.file_type,
        ca.created_at,
        c.id AS card_id,
        c.title AS card_title,
        b.id AS board_id,
        b.title AS board_title,
        b.color AS board_color,
        u.name AS uploader_name
       FROM card_attachments ca
       JOIN cards c ON ca.card_id = c.id
       JOIN boards b ON ca.board_id = b.id
       JOIN board_members bm ON b.id = bm.board_id
       JOIN users u ON ca.uploaded_by = u.id
       WHERE bm.user_id = $1
       ORDER BY ca.created_at DESC`,
      [userId]
    );

    return res.json({ files: filesRes.rows });
  } catch (err) {
    console.error('[Get Files Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve files.' });
  }
});

export default router;

