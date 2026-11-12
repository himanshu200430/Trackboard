import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();
router.use(requireAuth);

// POST /api/labels - Create label (Member or Owner)
router.post('/', requireRole('member'), async (req, res) => {
  try {
    const { board_id, name, color } = req.body;

    if (!board_id || !name?.trim() || !color?.trim()) {
      return res.status(400).json({ error: 'board_id, name, and color are required.' });
    }

    const insertRes = await query(
      `INSERT INTO labels (board_id, name, color)
       VALUES ($1, $2, $3)
       RETURNING id, board_id, name, color`,
      [board_id, name.trim(), color.trim()]
    );

    return res.status(201).json({ label: insertRes.rows[0], message: 'Label created.' });
  } catch (err) {
    console.error('[Create Label Error]:', err);
    return res.status(500).json({ error: 'Failed to create label.' });
  }
});

// PATCH /api/labels/:id - Edit label
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const labelRes = await query('SELECT board_id FROM labels WHERE id = $1', [id]);
    if (labelRes.rows.length === 0) {
      return res.status(404).json({ error: 'Label not found.' });
    }

    // Check membership
    const memberRes = await query(
      'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
      [labelRes.rows[0].board_id, req.user.id]
    );

    if (memberRes.rows.length === 0 || memberRes.rows[0].role === 'viewer') {
      return res.status(403).json({ error: 'Only members or owners can edit labels.' });
    }

    const updates = [];
    const values = [];
    let pIdx = 1;

    if (name !== undefined && name.trim()) {
      updates.push(`name = $${pIdx++}`);
      values.push(name.trim());
    }

    if (color !== undefined && color.trim()) {
      updates.push(`color = $${pIdx++}`);
      values.push(color.trim());
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided.' });
    }

    values.push(id);
    const sql = `UPDATE labels SET ${updates.join(', ')} WHERE id = $${pIdx} RETURNING id, board_id, name, color`;
    const updated = await query(sql, values);

    return res.json({ label: updated.rows[0], message: 'Label updated.' });
  } catch (err) {
    console.error('[Update Label Error]:', err);
    return res.status(500).json({ error: 'Failed to update label.' });
  }
});

// DELETE /api/labels/:id - Delete label
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const labelRes = await query('SELECT board_id FROM labels WHERE id = $1', [id]);
    if (labelRes.rows.length === 0) {
      return res.status(404).json({ error: 'Label not found.' });
    }

    // Check membership
    const memberRes = await query(
      'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
      [labelRes.rows[0].board_id, req.user.id]
    );

    if (memberRes.rows.length === 0 || memberRes.rows[0].role === 'viewer') {
      return res.status(403).json({ error: 'Only members or owners can delete labels.' });
    }

    await query('DELETE FROM labels WHERE id = $1', [id]);
    return res.json({ message: 'Label deleted.' });
  } catch (err) {
    console.error('[Delete Label Error]:', err);
    return res.status(500).json({ error: 'Failed to delete label.' });
  }
});

export default router;

