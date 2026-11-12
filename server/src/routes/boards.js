import express from 'express';
import { query, withTransaction } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();
router.use(requireAuth);

// Desaturated indie palette default labels
const DEFAULT_LABELS = [
  { name: 'Bug', color: '#B2433D' },
  { name: 'Feature', color: '#2F7A5E' },
  { name: 'Design', color: '#B87B28' },
  { name: 'Urgent', color: '#9E3B4E' },
  { name: 'Documentation', color: '#486581' },
];

// GET /api/boards - List boards the user has access to
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const boardsResult = await query(
      `SELECT 
        b.id,
        b.title,
        b.color,
        b.created_at,
        b.owner_id,
        bm.role AS user_role,
        (SELECT COUNT(*)::int FROM lists l WHERE l.board_id = b.id) AS list_count,
        (SELECT COUNT(*)::int FROM cards c WHERE c.board_id = b.id AND c.archived = false) AS card_count,
        (SELECT COUNT(*)::int FROM board_members m WHERE m.board_id = b.id) AS member_count
       FROM boards b
       JOIN board_members bm ON b.id = bm.board_id
       WHERE bm.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );

    return res.json({ boards: boardsResult.rows });
  } catch (err) {
    console.error('[Get Boards Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve boards.' });
  }
});

// POST /api/boards - Create a new board
router.post('/', async (req, res) => {
  try {
    const { title, color = '#C85A32' } = req.body;
    const userId = req.user.id;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Board title is required.' });
    }

    const newBoard = await withTransaction(async (client) => {
      // 1. Insert board
      const bRes = await client.query(
        `INSERT INTO boards (title, color, owner_id)
         VALUES ($1, $2, $3)
         RETURNING id, title, color, owner_id, created_at`,
        [title.trim(), color, userId]
      );
      const board = bRes.rows[0];

      // 2. Insert creator into board_members as 'owner'
      await client.query(
        `INSERT INTO board_members (board_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [board.id, userId]
      );

      // 3. Seed default labels for convenient organization
      for (const lbl of DEFAULT_LABELS) {
        await client.query(
          `INSERT INTO labels (board_id, name, color)
           VALUES ($1, $2, $3)`,
          [board.id, lbl.name, lbl.color]
        );
      }

      // 4. Create standard initial lists
      const defaultLists = ['To Do', 'In Progress', 'Done'];
      let pos = 1000.0;
      for (const listTitle of defaultLists) {
        await client.query(
          `INSERT INTO lists (board_id, title, position)
           VALUES ($1, $2, $3)`,
          [board.id, listTitle, pos]
        );
        pos += 1000.0;
      }

      return board;
    });

    return res.status(201).json({
      board: {
        ...newBoard,
        user_role: 'owner',
        list_count: 3,
        card_count: 0,
        member_count: 1,
      },
      message: 'Board created successfully.',
    });
  } catch (err) {
    console.error('[Create Board Error]:', err);
    return res.status(500).json({ error: 'Failed to create board.' });
  }
});

// GET /api/boards/:boardId - Full board detail (lists, cards, labels, members)
router.get('/:boardId', requireRole('viewer'), async (req, res) => {
  try {
    const { boardId } = req.params;
    const userRole = req.userRole;

    // 1. Board info
    const boardRes = await query(
      `SELECT id, title, color, owner_id, created_at FROM boards WHERE id = $1`,
      [boardId]
    );

    if (boardRes.rows.length === 0) {
      return res.status(404).json({ error: 'Board not found.' });
    }
    const board = boardRes.rows[0];

    // 2. Lists in fractional order
    const listsRes = await query(
      `SELECT id, board_id, title, position, created_at
       FROM lists
       WHERE board_id = $1
       ORDER BY position ASC`,
      [boardId]
    );

    // 3. Active cards with their labels
    const cardsRes = await query(
      `SELECT 
        c.id,
        c.list_id,
        c.board_id,
        c.title,
        c.description,
        c.due_date,
        c.position,
        c.archived,
        c.created_at,
        c.updated_at,
        COALESCE(
          json_agg(
            json_build_object('id', l.id, 'name', l.name, 'color', l.color)
          ) FILTER (WHERE l.id IS NOT NULL), '[]'
        ) AS labels
       FROM cards c
       LEFT JOIN card_labels cl ON c.id = cl.card_id
       LEFT JOIN labels l ON cl.label_id = l.id
       WHERE c.board_id = $1 AND c.archived = false
       GROUP BY c.id
       ORDER BY c.position ASC`,
      [boardId]
    );

    // 4. Board labels
    const labelsRes = await query(
      `SELECT id, board_id, name, color FROM labels WHERE board_id = $1 ORDER BY name ASC`,
      [boardId]
    );

    // 5. Board members
    const membersRes = await query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        bm.role
       FROM board_members bm
       JOIN users u ON bm.user_id = u.id
       WHERE bm.board_id = $1
       ORDER BY 
         CASE WHEN bm.role = 'owner' THEN 1 WHEN bm.role = 'member' THEN 2 ELSE 3 END,
         u.name ASC`,
      [boardId]
    );

    return res.json({
      board,
      userRole,
      lists: listsRes.rows,
      cards: cardsRes.rows,
      labels: labelsRes.rows,
      members: membersRes.rows,
    });
  } catch (err) {
    console.error('[Get Board Detail Error]:', err);
    return res.status(500).json({ error: 'Failed to fetch board details.' });
  }
});

// PATCH /api/boards/:boardId - Update board title or color (Owner only)
router.patch('/:boardId', requireRole('owner'), async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title, color } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined && title.trim()) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title.trim());
    }

    if (color !== undefined && color.trim()) {
      updates.push(`color = $${paramIndex++}`);
      values.push(color.trim());
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update.' });
    }

    values.push(boardId);
    const sql = `UPDATE boards SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, title, color, owner_id, created_at`;

    const result = await query(sql, values);
    return res.json({ board: result.rows[0], message: 'Board updated successfully.' });
  } catch (err) {
    console.error('[Update Board Error]:', err);
    return res.status(500).json({ error: 'Failed to update board.' });
  }
});

// DELETE /api/boards/:boardId - Delete board (Owner only)
router.delete('/:boardId', requireRole('owner'), async (req, res) => {
  try {
    const { boardId } = req.params;
    await query('DELETE FROM boards WHERE id = $1', [boardId]);
    return res.json({ message: 'Board deleted permanently.' });
  } catch (err) {
    console.error('[Delete Board Error]:', err);
    return res.status(500).json({ error: 'Failed to delete board.' });
  }
});

// POST /api/boards/:boardId/members - Invite/Add member (Owner only)
router.post('/:boardId', requireRole('owner')); // checked via route below
router.post('/:boardId/members', requireRole('owner'), async (req, res) => {
  try {
    const { boardId } = req.params;
    const { email, role = 'member' } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ error: 'Email is required to invite a collaborator.' });
    }

    if (!['owner', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find registered user
    const userRes = await query('SELECT id, name, email FROM users WHERE email = $1', [normalizedEmail]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: `No Tackboard account found for ${normalizedEmail}. Ask them to sign up first!` });
    }

    const targetUser = userRes.rows[0];

    // Check if already a member
    const existingMember = await query(
      'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
      [boardId, targetUser.id]
    );

    if (existingMember.rows.length > 0) {
      return res.status(409).json({ error: `${targetUser.name} is already a member of this board.` });
    }

    await query(
      'INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3)',
      [boardId, targetUser.id, role]
    );

    return res.status(201).json({
      member: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role,
      },
      message: `${targetUser.name} added as ${role}.`,
    });
  } catch (err) {
    console.error('[Add Member Error]:', err);
    return res.status(500).json({ error: 'Failed to add member to board.' });
  }
});

// PATCH /api/boards/:boardId/members/:userId - Change member role (Owner only)
router.patch('/:boardId/members/:userId', requireRole('owner'), async (req, res) => {
  try {
    const { boardId, userId } = req.params;
    const { role } = req.body;

    if (!['owner', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    // Verify target board owner
    const boardRes = await query('SELECT owner_id FROM boards WHERE id = $1', [boardId]);
    if (boardRes.rows.length > 0 && boardRes.rows[0].owner_id === userId && role !== 'owner') {
      return res.status(400).json({ error: 'Cannot demote the primary board owner.' });
    }

    const updated = await query(
      `UPDATE board_members
       SET role = $1
       WHERE board_id = $2 AND user_id = $3
       RETURNING role`,
      [role, boardId, userId]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found on this board.' });
    }

    return res.json({ role: updated.rows[0].role, message: `Role updated to ${role}.` });
  } catch (err) {
    console.error('[Update Member Role Error]:', err);
    return res.status(500).json({ error: 'Failed to update member role.' });
  }
});

// DELETE /api/boards/:boardId/members/:userId - Remove member (Owner only, or user leaving)
router.delete('/:boardId/members/:userId', requireRole('member'), async (req, res) => {
  try {
    const { boardId, userId } = req.params;
    const currentUserId = req.user.id;
    const currentUserRole = req.userRole;

    // Check if the board owner is being removed
    const boardRes = await query('SELECT owner_id FROM boards WHERE id = $1', [boardId]);
    if (boardRes.rows.length > 0 && boardRes.rows[0].owner_id === userId) {
      return res.status(400).json({ error: 'Cannot remove the primary board owner.' });
    }

    // Only owner can remove other members; a member can only remove themselves
    if (currentUserRole !== 'owner' && currentUserId !== userId) {
      return res.status(403).json({ error: 'Only the board owner can remove other collaborators.' });
    }

    await query('DELETE FROM board_members WHERE board_id = $1 AND user_id = $2', [boardId, userId]);
    return res.json({ message: 'Member removed from board.' });
  } catch (err) {
    console.error('[Remove Member Error]:', err);
    return res.status(500).json({ error: 'Failed to remove member.' });
  }
});

export default router;

