import express from 'express';
import { query, withTransaction } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();
router.use(requireAuth);

// Helper: Rebalance lists when fractional gap drops below threshold
export const rebalanceLists = async (client, boardId) => {
  await client.query(
    `WITH ranked AS (
       SELECT id, ROW_NUMBER() OVER (ORDER BY position ASC) * 1000.0 AS new_pos
       FROM lists
       WHERE board_id = $1
     )
     UPDATE lists
     SET position = ranked.new_pos
     FROM ranked
     WHERE lists.id = ranked.id`,
    [boardId]
  );
};

// POST /api/lists - Create a new list (Member or Owner)
router.post('/', requireRole('member'), async (req, res) => {
  try {
    const { board_id, title } = req.body;

    if (!board_id || !title?.trim()) {
      return res.status(400).json({ error: 'board_id and title are required.' });
    }

    // Determine position at the end of the board
    const maxPosRes = await query(
      'SELECT COALESCE(MAX(position), 0) AS max_pos FROM lists WHERE board_id = $1',
      [board_id]
    );
    const nextPos = (parseFloat(maxPosRes.rows[0].max_pos) || 0) + 1000.0;

    const insertRes = await query(
      `INSERT INTO lists (board_id, title, position)
       VALUES ($1, $2, $3)
       RETURNING id, board_id, title, position, created_at`,
      [board_id, title.trim(), nextPos]
    );

    return res.status(201).json({
      list: insertRes.rows[0],
      message: 'List created successfully.',
    });
  } catch (err) {
    console.error('[Create List Error]:', err);
    return res.status(500).json({ error: 'Failed to create list.' });
  }
});

// PATCH /api/lists/:id - Rename list or update position (Member or Owner)
router.patch('/:id', requireRole('member'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, position, gap } = req.body;

    const listRes = await query('SELECT board_id, position FROM lists WHERE id = $1', [id]);
    if (listRes.rows.length === 0) {
      return res.status(404).json({ error: 'List not found.' });
    }
    const current = listRes.rows[0];

    const updates = [];
    const values = [];
    let paramIdx = 1;

    if (title !== undefined && title.trim()) {
      updates.push(`title = $${paramIdx++}`);
      values.push(title.trim());
    }

    let needsRebalance = false;
    if (position !== undefined && typeof position === 'number') {
      updates.push(`position = $${paramIdx++}`);
      values.push(position);

      if (gap !== undefined && Math.abs(gap) < 0.0001) {
        needsRebalance = true;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update.' });
    }

    values.push(id);
    const sql = `UPDATE lists SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING id, board_id, title, position, created_at`;

    const updatedList = await withTransaction(async (client) => {
      const resUpdate = await client.query(sql, values);
      if (needsRebalance) {
        console.log(`[Rebalance] Precision gap < 0.0001 reached. Rebalancing lists for board ${current.board_id}`);
        await rebalanceLists(client, current.board_id);
        const reRead = await client.query('SELECT * FROM lists WHERE id = $1', [id]);
        return reRead.rows[0];
      }
      return resUpdate.rows[0];
    });

    return res.json({ list: updatedList, message: 'List updated successfully.' });
  } catch (err) {
    console.error('[Update List Error]:', err);
    return res.status(500).json({ error: 'Failed to update list.' });
  }
});

// DELETE /api/lists/:id - Delete list (Member or Owner)
router.delete('/:id', requireRole('member'), async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM lists WHERE id = $1', [id]);
    return res.json({ message: 'List deleted successfully.' });
  } catch (err) {
    console.error('[Delete List Error]:', err);
    return res.status(500).json({ error: 'Failed to delete list.' });
  }
});

export default router;

