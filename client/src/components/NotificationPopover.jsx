import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Clock, MessageSquare, Lightbulb, Info, CheckCheck } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export const NotificationPopover = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleNotificationClick = (n) => {
    if (!n.read) {
      markAsRead(n.id);
    }
    setIsOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  const formatTimeAgo = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="btn-ghost"
        style={{
          position: 'relative',
          padding: '6px',
          color: isOpen ? 'var(--accent)' : 'var(--ink-secondary)',
          borderRadius: 'var(--radius-xs)',
        }}
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              backgroundColor: '#B2433D',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 700,
              minWidth: '16px',
              height: '16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              lineHeight: 1,
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: '8px',
            width: '340px',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-modal)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'slideDown 150ms cubic-bezier(0.2, 0, 0, 1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 14px',
              borderBottom: 'var(--border-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Notifications</span>
              {unreadCount > 0 && (
                <span className="badge" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="btn-ghost"
                style={{ fontSize: '11px', color: 'var(--accent)', padding: '2px 6px' }}
                title="Mark all as read"
              >
                <CheckCheck size={13} style={{ marginRight: 3 }} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length > 0 ? (
              notifications.map((n) => {
                const isSuggestion = n.type === 'suggestion';
                const isDue = n.type === 'due_soon';
                const isFeedback = n.type === 'feedback';

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--bg-muted)',
                      backgroundColor: n.read ? 'transparent' : 'rgba(200, 90, 50, 0.04)',
                      display: 'flex',
                      gap: '10px',
                      cursor: n.link ? 'pointer' : 'default',
                      transition: 'background-color 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-canvas)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = n.read ? 'transparent' : 'rgba(200, 90, 50, 0.04)';
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: isDue
                          ? '#FEE2E2'
                          : isSuggestion
                          ? '#FEF3C7'
                          : isFeedback
                          ? '#EAF3EE'
                          : '#EEF2F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      {isDue ? (
                        <Clock size={14} color="#991B1B" />
                      ) : isSuggestion ? (
                        <Lightbulb size={14} color="#92400E" />
                      ) : isFeedback ? (
                        <Check size={14} color="#2D5A4C" />
                      ) : (
                        <MessageSquare size={14} color="#3F627D" />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: n.read ? 500 : 600,
                            color: 'var(--ink-primary)',
                            lineHeight: '1.3',
                          }}
                        >
                          {n.title}
                        </div>
                        <span
                          style={{
                            fontSize: '10px',
                            color: 'var(--ink-muted)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {formatTimeAgo(n.created_at)}
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: '11px',
                          color: 'var(--ink-secondary)',
                          marginTop: '3px',
                          lineHeight: '1.4',
                          wordBreak: 'break-word',
                        }}
                      >
                        {n.message}
                      </p>
                    </div>

                    {!n.read && (
                      <div
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent)',
                          flexShrink: 0,
                          alignSelf: 'center',
                        }}
                      />
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                <Bell size={24} color="var(--ink-muted)" style={{ opacity: 0.5, marginBottom: '6px' }} />
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink-secondary)' }}>
                  All caught up!
                </div>
                <p style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                  No new realtime notifications right now.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPopover;

