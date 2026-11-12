import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

// GET /api/cards/:cardId/comments
router.get('/:cardId/comments', async (req, res) => {
  try {
    const { cardId } = req.params;

    const commentsRes = await query(
      `SELECT 
        cc.id,
        cc.card_id,
        cc.user_id,
        cc.content,
        cc.type,
        cc.created_at,
        u.name AS user_name,
        u.email AS user_email
       FROM card_comments cc
       JOIN users u ON cc.user_id = u.id
       WHERE cc.card_id = $1
       ORDER BY cc.created_at ASC`,
      [cardId]
    );

    return res.json({ comments: commentsRes.rows });
  } catch (err) {
    console.error('[Get Comments Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve card comments.' });
  }
});

// POST /api/cards/:cardId/comments
router.post('/:cardId/comments', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { content, type = 'comment' } = req.body;
    const userId = req.user.id;
    const userName = req.user.name;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty.' });
    }

    // Verify card and fetch board info
    const cardRes = await query(
      `SELECT c.id, c.title, c.board_id, b.title AS board_title 
       FROM cards c 
       JOIN boards b ON c.board_id = b.id 
       WHERE c.id = $1`,
      [cardId]
    );

    if (cardRes.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found.' });
    }
    const card = cardRes.rows[0];

    const insertRes = await query(
      `INSERT INTO card_comments (card_id, user_id, content, type)
       VALUES ($1, $2, $3, $4)
       RETURNING id, card_id, user_id, content, type, created_at`,
      [cardId, userId, content.trim(), type]
    );

    const newComment = {
      ...insertRes.rows[0],
      user_name: userName,
      user_email: req.user.email,
    };

    // Create notifications for other board members
    const membersRes = await query(
      `SELECT user_id FROM board_members WHERE board_id = $1 AND user_id != $2`,
      [card.board_id, userId]
    );

    const typeLabel = type === 'suggestion' ? 'suggested' : type === 'feedback' ? 'gave feedback on' : 'commented on';
    const notifTitle = `New ${type} from ${userName}`;
    const notifMessage = `${userName} ${typeLabel} "${card.title}": "${content.trim().slice(0, 80)}"`;
    const notifLink = `/b/${card.board_id}/c/${card.id}`;

    for (const m of membersRes.rows) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, $2, $3, $4, $5)`,
        [m.user_id, notifTitle, notifMessage, type, notifLink]
      ).catch(() => {});
    }

    return res.status(201).json({ comment: newComment });
  } catch (err) {
    console.error('[Create Comment Error]:', err);
    return res.status(500).json({ error: 'Failed to post comment.' });
  }
});

// DELETE /api/cards/:cardId/comments/:commentId
router.delete('/:cardId/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Only comment author or board owner can delete
    const commentRes = await query(
      `SELECT cc.user_id, c.board_id, bm.role
       FROM card_comments cc
       JOIN cards c ON cc.card_id = c.id
       LEFT JOIN board_members bm ON c.board_id = bm.board_id AND bm.user_id = $2
       WHERE cc.id = $1`,
      [commentId, userId]
    );

    if (commentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    const comment = commentRes.rows[0];
    if (comment.user_id !== userId && comment.role !== 'owner') {
      return res.status(403).json({ error: 'You do not have permission to delete this comment.' });
    }

    await query('DELETE FROM card_comments WHERE id = $1', [commentId]);
    return res.json({ message: 'Comment removed.' });
  } catch (err) {
    console.error('[Delete Comment Error]:', err);
    return res.status(500).json({ error: 'Failed to delete comment.' });
  }
});

export default router;

