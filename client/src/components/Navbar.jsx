import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutGrid, LogOut, HelpCircle, Search, Shield } from 'lucide-react';
import NotificationPopover from './NotificationPopover';

export const Navbar = ({ board, userRole, searchQuery, onSearchChange, onOpenShortcuts }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header
      style={{
        height: '52px',
        borderBottom: 'var(--border-hairline)',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Left: Brand & Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--ink-primary)',
          }}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: 'var(--shadow-subtle)',
            }}
          >
            <LayoutGrid size={15} strokeWidth={2} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.02em' }}>
            Tackboard
          </span>
        </Link>

        {board && (
          <>
            <span style={{ color: 'var(--ink-faint)', fontSize: '16px' }}>/</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: board.color || 'var(--accent)',
                }}
              />
              <span
                className="font-display"
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--ink-primary)',
                  maxWidth: '260px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {board.title}
              </span>

              {userRole && (
                <span className={`badge role-badge role-${userRole}`}>
                  <Shield size={10} style={{ marginRight: 2 }} />
                  {userRole}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: Actions, Search, User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Quick Search */}
        {onSearchChange !== undefined && (
          <div style={{ position: 'relative', width: '180px' }}>
            <Search
              size={13}
              color="var(--ink-muted)"
              style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              id="global-search-input"
              type="text"
              placeholder="Filter cards... (/)"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input"
              style={{
                paddingLeft: '28px',
                paddingRight: '22px',
                paddingTop: '4px',
                paddingBottom: '4px',
                fontSize: '12px',
                height: '28px',
                backgroundColor: 'var(--bg-canvas)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  fontSize: '12px',
                  color: 'var(--ink-muted)',
                }}
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Realtime Notification Bell */}
        <NotificationPopover />

        {/* Shortcuts Cheat Sheet Trigger */}
        <button
          onClick={onOpenShortcuts}
          className="btn-ghost"
          title="Keyboard shortcuts (?)"
          style={{ padding: '6px', color: 'var(--ink-secondary)' }}
        >
          <HelpCircle size={17} />
        </button>

        {/* User Info & Logout */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px', borderLeft: 'var(--border-hairline)' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--bg-muted)',
                border: 'var(--border-hairline)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '12px',
                color: 'var(--ink-primary)',
              }}
              title={`${user.name} (${user.email})`}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '12px', height: '28px' }}
              title="Sign out of Tackboard"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;

