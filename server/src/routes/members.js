import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/members - List team collaborators across user's boards
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        u.created_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'board_id', b.id,
              'board_title', b.title,
              'board_color', b.color,
              'role', bm.role
            )
          ) FILTER (WHERE b.id IS NOT NULL), '[]'
        ) AS memberships
       FROM users u
       JOIN board_members bm ON u.id = bm.user_id
       JOIN boards b ON bm.board_id = b.id
       WHERE b.id IN (
         SELECT board_id FROM board_members WHERE user_id = $1
       )
       GROUP BY u.id, u.name, u.email, u.created_at
       ORDER BY u.name ASC`,
      [userId]
    );

    return res.json({ members: result.rows });
  } catch (err) {
    console.error('[Get Team Members Error]:', err);
    return res.status(500).json({ error: 'Failed to fetch team directory.' });
  }
});

export default router;

