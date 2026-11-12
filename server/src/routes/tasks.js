import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/tasks - Aggregated tasks across all boards
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const tasksRes = await query(
      `SELECT 
        c.id,
        c.title,
        c.description,
        c.due_date,
        c.archived,
        c.created_at,
        c.updated_at,
        l.id AS list_id,
        l.title AS list_title,
        b.id AS board_id,
        b.title AS board_title,
        b.color AS board_color,
        COALESCE(
          json_agg(
            json_build_object('id', lbl.id, 'name', lbl.name, 'color', lbl.color)
          ) FILTER (WHERE lbl.id IS NOT NULL), '[]'
        ) AS labels,
        (SELECT COUNT(*)::int FROM card_comments cc WHERE cc.card_id = c.id) AS comment_count
       FROM cards c
       JOIN lists l ON c.list_id = l.id
       JOIN boards b ON c.board_id = b.id
       JOIN board_members bm ON b.id = bm.board_id
       LEFT JOIN card_labels cl ON c.id = cl.card_id
       LEFT JOIN labels lbl ON cl.label_id = lbl.id
       WHERE bm.user_id = $1 AND c.archived = false
       GROUP BY c.id, l.id, l.title, b.id, b.title, b.color
       ORDER BY c.due_date ASC NULLS LAST, c.updated_at DESC`,
      [userId]
    );

    return res.json({ tasks: tasksRes.rows });
  } catch (err) {
    console.error('[Get All Tasks Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve tasks.' });
  }
});

export default router;

