import { query } from '../config/db.js';

const ROLE_RANK = {
  viewer: 1,
  member: 2,
  owner: 3,
};

/**
 * RBAC middleware enforcing role hierarchy: viewer (1) < member (2) < owner (3)
 * @param {'viewer' | 'member' | 'owner'} minimumRole
 */
export const requireRole = (minimumRole = 'member') => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      let boardId = req.params.boardId;

      if (!boardId && req.baseUrl.endsWith('/boards') && req.params.id) {
        boardId = req.params.id;
      }

      if (!boardId && req.body?.board_id) {
        boardId = req.body.board_id;
      }

      // If route is on a list, find its board_id
      if (!boardId && req.baseUrl.endsWith('/lists') && req.params.id) {
        const listRes = await query('SELECT board_id FROM lists WHERE id = $1', [req.params.id]);
        if (listRes.rows.length === 0) {
          return res.status(404).json({ error: 'List not found.' });
        }
        boardId = listRes.rows[0].board_id;
      }

      // If route is on a card, find its board_id
      if (!boardId && req.baseUrl.endsWith('/cards') && req.params.id) {
        const cardRes = await query('SELECT board_id FROM cards WHERE id = $1', [req.params.id]);
        if (cardRes.rows.length === 0) {
          return res.status(404).json({ error: 'Card not found.' });
        }
        boardId = cardRes.rows[0].board_id;
      }

      if (!boardId) {
        return res.status(400).json({ error: 'Board identifier missing from request.' });
      }

      // Query membership
      const memberRes = await query(
        'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
        [boardId, userId]
      );

      // If user is not a member of this board
      if (memberRes.rows.length === 0) {
        // Reads return 404 (not 403) so board IDs do not leak
        return res.status(404).json({ error: 'Board not found or access denied.' });
      }

      const userRole = memberRes.rows[0].role;
      const userRank = ROLE_RANK[userRole] || 0;
      const requiredRank = ROLE_RANK[minimumRole] || 2;

      if (userRank < requiredRank) {
        return res.status(403).json({
          error: `Forbidden: ${minimumRole.charAt(0).toUpperCase() + minimumRole.slice(1)} access required. Your role is ${userRole}.`
        });
      }

      // Attach context to request
      req.boardId = boardId;
      req.userRole = userRole;
      next();
    } catch (err) {
      console.error('[RBAC Error]:', err);
      return res.status(500).json({ error: 'Failed to verify board permissions.' });
    }
  };
};

