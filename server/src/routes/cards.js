import express from 'express';
import { query, withTransaction } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();
router.use(requireAuth);

/**
 * Rebalance cards in a specific list when gap between neighbors drops below 0.0001
 * Uses single transaction and ROW_NUMBER() to renumber 1000, 2000, 3000...
 */
export const rebalanceCards = async (client, listId) => {
  await client.query(
    `WITH ranked AS (
       SELECT id, ROW_NUMBER() OVER (ORDER BY position ASC) * 1000.0 AS new_pos
       FROM cards
       WHERE list_id = $1 AND archived = false
     )
     UPDATE cards
     SET position = ranked.new_pos
     FROM ranked
     WHERE cards.id = ranked.id`,
    [listId]
  );
};

// GET /api/cards/:id - Card details (Viewer, Member, or Owner)
router.get('/:id', requireRole('viewer'), async (req, res) => {
  try {
    const { id } = req.params;

    const cardRes = await query(
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
        l.title AS list_title,
        b.title AS board_title,
        COALESCE(
          json_agg(
            json_build_object('id', lbl.id, 'name', lbl.name, 'color', lbl.color)
          ) FILTER (WHERE lbl.id IS NOT NULL), '[]'
        ) AS labels
       FROM cards c
       JOIN lists l ON c.list_id = l.id
       JOIN boards b ON c.board_id = b.id
       LEFT JOIN card_labels cl ON c.id = cl.card_id
       LEFT JOIN labels lbl ON cl.label_id = lbl.id
       WHERE c.id = $1
       GROUP BY c.id, l.title, b.title`,
      [id]
    );

    if (cardRes.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found.' });
    }

    return res.json({ card: cardRes.rows[0] });
  } catch (err) {
    console.error('[Get Card Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve card.' });
  }
});

// POST /api/cards - Create card (Member or Owner)
router.post('/', requireRole('member'), async (req, res) => {
  try {
    const { list_id, board_id, title, description = '', due_date = null } = req.body;

    if (!list_id || !board_id || !title?.trim()) {
      return res.status(400).json({ error: 'list_id, board_id, and title are required.' });
    }

    // Determine position at the end of the list
    const maxPosRes = await query(
      'SELECT COALESCE(MAX(position), 0) AS max_pos FROM cards WHERE list_id = $1 AND archived = false',
      [list_id]
    );
    const nextPos = (parseFloat(maxPosRes.rows[0].max_pos) || 0) + 1000.0;

    const insertRes = await query(
      `INSERT INTO cards (list_id, board_id, title, description, due_date, position)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, list_id, board_id, title, description, due_date, position, archived, created_at, updated_at`,
      [list_id, board_id, title.trim(), description.trim(), due_date || null, nextPos]
    );

    const createdCard = {
      ...insertRes.rows[0],
      labels: [],
    };

    return res.status(201).json({ card: createdCard, message: 'Card created successfully.' });
  } catch (err) {
    console.error('[Create Card Error]:', err);
    return res.status(500).json({ error: 'Failed to create card.' });
  }
});

// PATCH /api/cards/:id - Edit card or Move card (fractional indexing) (Member or Owner)
router.patch('/:id', requireRole('member'), async (req, res) => {
  try {
    const { id } = req.params;
    const { list_id, position, gap, title, description, due_date, archived } = req.body;

    // Check existing card
    const existingRes = await query(
      'SELECT id, list_id, board_id, position FROM cards WHERE id = $1',
      [id]
    );

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found.' });
    }
    const currentCard = existingRes.rows[0];

    // Case 1: Drag & Drop Move (ONE query with parameterized UPDATE)
    if (position !== undefined && typeof position === 'number') {
      const targetListId = list_id || currentCard.list_id;
      const targetPosition = position;
      const shouldRebalance = gap !== undefined && Math.abs(gap) < 0.0001;

      const updatedCard = await withTransaction(async (client) => {
        // ONE UPDATE cards SET list_id=$1, position=$2 WHERE id=$3
        const updateRes = await client.query(
          `UPDATE cards 
           SET list_id = $1, position = $2, updated_at = now()
           WHERE id = $3
           RETURNING id, list_id, board_id, title, description, due_date, position, archived, created_at, updated_at`,
          [targetListId, targetPosition, id]
        );

        if (shouldRebalance) {
          console.log(`[Rebalance] Precision gap < 0.0001 reached in list ${targetListId}. Rebalancing cards.`);
          await rebalanceCards(client, targetListId);
          const refetched = await client.query(
            `SELECT c.*, COALESCE(json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color)) FILTER (WHERE l.id IS NOT NULL), '[]') AS labels
             FROM cards c
             LEFT JOIN card_labels cl ON c.id = cl.card_id
             LEFT JOIN labels l ON cl.label_id = l.id
             WHERE c.id = $1
             GROUP BY c.id`,
            [id]
          );
          return refetched.rows[0];
        }

        // Return updated card with labels
        const withLabels = await client.query(
          `SELECT c.*, COALESCE(json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color)) FILTER (WHERE l.id IS NOT NULL), '[]') AS labels
           FROM cards c
           LEFT JOIN card_labels cl ON c.id = cl.card_id
           LEFT JOIN labels l ON cl.label_id = l.id
           WHERE c.id = $1
           GROUP BY c.id`,
          [id]
        );
        return withLabels.rows[0];
      });

      return res.json({ card: updatedCard, message: 'Card position updated.' });
    }

    // Case 2: Content Edits (title, description, due_date, archived)
    const updates = ['updated_at = now()'];
    const values = [];
    let pIdx = 1;

    if (title !== undefined && title.trim()) {
      updates.push(`title = $${pIdx++}`);
      values.push(title.trim());
    }

    if (description !== undefined) {
      updates.push(`description = $${pIdx++}`);
      values.push(description);
    }

    if (due_date !== undefined) {
      updates.push(`due_date = $${pIdx++}`);
      values.push(due_date ? new Date(due_date) : null);
    }

    if (archived !== undefined) {
      updates.push(`archived = $${pIdx++}`);
      values.push(Boolean(archived));
    }

    if (updates.length === 1) {
      return res.status(400).json({ error: 'No editable fields provided.' });
    }

    values.push(id);
    const sql = `UPDATE cards SET ${updates.join(', ')} WHERE id = $${pIdx} RETURNING id, list_id, board_id, title, description, due_date, position, archived, created_at, updated_at`;

    await query(sql, values);

    // Fetch complete card with labels
    const refreshed = await query(
      `SELECT c.*, COALESCE(json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color)) FILTER (WHERE l.id IS NOT NULL), '[]') AS labels
       FROM cards c
       LEFT JOIN card_labels cl ON c.id = cl.card_id
       LEFT JOIN labels l ON cl.label_id = l.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [id]
    );

    return res.json({ card: refreshed.rows[0], message: 'Card updated successfully.' });
  } catch (err) {
    console.error('[Update Card Error]:', err);
    return res.status(500).json({ error: 'Failed to update card.' });
  }
});

// POST /api/cards/:id/labels - Toggle label on card (Member or Owner)
router.post('/:id/labels', requireRole('member'), async (req, res) => {
  try {
    const { id } = req.params;
    const { label_id } = req.body;

    if (!label_id) {
      return res.status(400).json({ error: 'label_id is required.' });
    }

    // Check if label already attached to this card
    const existing = await query(
      'SELECT 1 FROM card_labels WHERE card_id = $1 AND label_id = $2',
      [id, label_id]
    );

    let attached = false;
    if (existing.rows.length > 0) {
      // Toggle off
      await query('DELETE FROM card_labels WHERE card_id = $1 AND label_id = $2', [id, label_id]);
      attached = false;
    } else {
      // Toggle on
      await query('INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)', [id, label_id]);
      attached = true;
    }

    // Return updated labels list
    const labelsRes = await query(
      `SELECT l.id, l.name, l.color
       FROM card_labels cl
       JOIN labels l ON cl.label_id = l.id
       WHERE cl.card_id = $1
       ORDER BY l.name ASC`,
      [id]
    );

    return res.json({
      cardId: id,
      attached,
      labels: labelsRes.rows,
      message: attached ? 'Label added.' : 'Label removed.',
    });
  } catch (err) {
    console.error('[Toggle Card Label Error]:', err);
    return res.status(500).json({ error: 'Failed to update card labels.' });
  }
});

// DELETE /api/cards/:id - Delete card permanently (Member or Owner)
router.delete('/:id', requireRole('member'), async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM cards WHERE id = $1', [id]);
    return res.json({ message: 'Card permanently deleted.' });
  } catch (err) {
    console.error('[Delete Card Error]:', err);
    return res.status(500).json({ error: 'Failed to delete card.' });
  }
});

export default router;

