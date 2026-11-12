import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, CheckSquare, Users, Shield } from 'lucide-react';

/**
 * Reusable Board Card component for dashboards and lists
 */
export const Board = ({ board }) => {
  return (
    <Link
      to={`/b/${board.id}`}
      className="board-card"
    >
      <div
        className="board-card-accent-bar"
        style={{ backgroundColor: board.color || 'var(--accent)' }}
      />

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span className={`badge role-badge role-${board.user_role || 'member'}`}>
            <Shield size={10} style={{ marginRight: 2 }} />
            {board.user_role || 'member'}
          </span>
        </div>

        <h3
          className="font-display"
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--ink-primary)',
            lineHeight: '1.3',
          }}
        >
          {board.title}
        </h3>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '11px',
          color: 'var(--ink-secondary)',
          marginTop: '16px',
          paddingTop: '10px',
          borderTop: '1px solid var(--bg-muted)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <LayoutGrid size={12} color="var(--ink-muted)" />
          {board.list_count || 0} lists
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <CheckSquare size={12} color="var(--ink-muted)" />
          {board.card_count || 0} cards
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: 'auto' }}>
          <Users size={12} color="var(--ink-muted)" />
          {board.member_count || 1} members
        </span>
      </div>
    </Link>
  );
};

export default Board;

