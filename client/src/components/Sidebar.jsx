import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  CheckSquare,
  Folder,
  Calendar,
  Users,
  BarChart2,
  Plus,
  Settings,
  User,
  Shield,
  LifeBuoy,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { AccountSettingsModal, TeamPermissionsModal, SupportModal } from './SettingsModals';

export const Sidebar = ({ onOpenCreateBoard }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);

  // Settings modals states
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Fetch user projects/boards for sidebar list
  useEffect(() => {
    const fetchSidebarBoards = async () => {
      try {
        const res = await fetch('/api/boards', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setBoards(data.boards || []);
        }
      } catch {}
    };

    fetchSidebarBoards();
  }, [location.pathname]);

  const mainMenuItems = [
    { label: 'Dashboard', icon: LayoutGrid, path: '/' },
    { label: 'Tasks', icon: CheckSquare, path: '/tasks' },
    { label: 'Files', icon: Folder, path: '/files' },
    { label: 'Calendar', icon: Calendar, path: '/calendar' },
    { label: 'Members', icon: Users, path: '/members' },
    { label: 'Reports', icon: BarChart2, path: '/reports' },
  ];

  return (
    <>
      <aside
        style={{
          width: isCollapsed ? '64px' : '240px',
          minWidth: isCollapsed ? '64px' : '240px',
          height: 'calc(100vh - 52px)',
          backgroundColor: 'var(--bg-surface)',
          borderRight: 'var(--border-hairline)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'width 200ms cubic-bezier(0.2, 0, 0, 1), min-width 200ms cubic-bezier(0.2, 0, 0, 1)',
          position: 'sticky',
          top: '52px',
          overflowY: 'auto',
          overflowX: 'hidden',
          zIndex: 40,
        }}
      >
        {/* Top: Menu Sections */}
        <div style={{ padding: isCollapsed ? '12px 8px' : '16px 12px' }}>
          {/* Collapse Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              marginBottom: '14px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--bg-muted)',
            }}
          >
            {!isCollapsed && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                WORKSPACE
              </span>
            )}
            <button
              onClick={() => setIsCollapsed((c) => !c)}
              className="btn-ghost"
              style={{ padding: '4px', color: 'var(--ink-muted)' }}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={15} />}
            </button>
          </div>

          {/* SECTION 1: MAIN MENU */}
          <div style={{ marginBottom: '20px' }}>
            {!isCollapsed && (
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px', marginBottom: '6px' }}>
                Main Menu
              </div>
            )}

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {mainMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className="sidebar-link"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: isCollapsed ? '8px 0' : '7px 10px',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--accent)' : 'var(--ink-secondary)',
                      backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                      transition: 'all 150ms ease',
                    }}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon size={16} color={isActive ? 'var(--accent)' : 'var(--ink-secondary)'} style={{ flexShrink: 0 }} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* SECTION 2: PROJECTS */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '0' : '0 8px',
                marginBottom: '6px',
              }}
            >
              {!isCollapsed && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Projects
                </span>
              )}

              {/* Add Project (+) Button */}
              <button
                onClick={onOpenCreateBoard}
                className="btn-ghost"
                style={{
                  padding: '2px 4px',
                  color: 'var(--accent)',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Add new project / board"
              >
                <Plus size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {boards.map((b) => {
                const isActive = location.pathname.startsWith(`/b/${b.id}`);

                return (
                  <NavLink
                    key={b.id}
                    to={`/b/${b.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '9px',
                      padding: isCollapsed ? '8px 0' : '6px 10px',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                      backgroundColor: isActive ? 'var(--bg-muted)' : 'transparent',
                    }}
                    title={b.title}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '2px',
                        backgroundColor: b.color || 'var(--accent)',
                        flexShrink: 0,
                      }}
                    />
                    {!isCollapsed && (
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.title}
                      </span>
                    )}
                  </NavLink>
                );
              })}

              {boards.length === 0 && !isCollapsed && (
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)', padding: '4px 8px', fontStyle: 'italic' }}>
                  No projects yet. Click + to add.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: SETTINGS (Bottom) */}
        <div
          style={{
            padding: isCollapsed ? '12px 8px' : '12px',
            borderTop: '1px solid var(--bg-muted)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          {!isCollapsed && (
            <div
              onClick={() => setIsSettingsExpanded((p) => !p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                cursor: 'pointer',
                marginBottom: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Settings size={13} />
                <span>Settings</span>
              </div>
              {isSettingsExpanded ? <ChevronDown size={12} color="var(--ink-muted)" /> : <ChevronRight size={12} color="var(--ink-muted)" />}
            </div>
          )}

          {(isSettingsExpanded || isCollapsed) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <button
                onClick={() => setIsAccountOpen(true)}
                className="btn-ghost"
                style={{
                  width: '100%',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  padding: isCollapsed ? '8px 0' : '6px 8px',
                  fontSize: '12px',
                  color: 'var(--ink-secondary)',
                  borderRadius: 'var(--radius-sm)',
                }}
                title="Account Settings"
              >
                <User size={15} style={{ flexShrink: 0 }} />
                {!isCollapsed && <span>Account Settings</span>}
              </button>

              <button
                onClick={() => setIsPermissionsOpen(true)}
                className="btn-ghost"
                style={{
                  width: '100%',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  padding: isCollapsed ? '8px 0' : '6px 8px',
                  fontSize: '12px',
                  color: 'var(--ink-secondary)',
                  borderRadius: 'var(--radius-sm)',
                }}
                title="Team Permissions"
              >
                <Shield size={15} style={{ flexShrink: 0 }} />
                {!isCollapsed && <span>Team Permissions</span>}
              </button>

              <button
                onClick={() => setIsSupportOpen(true)}
                className="btn-ghost"
                style={{
                  width: '100%',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  padding: isCollapsed ? '8px 0' : '6px 8px',
                  fontSize: '12px',
                  color: 'var(--ink-secondary)',
                  borderRadius: 'var(--radius-sm)',
                }}
                title="Support"
              >
                <LifeBuoy size={15} style={{ flexShrink: 0 }} />
                {!isCollapsed && <span>Support</span>}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Settings Dialogs */}
      <AccountSettingsModal isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
      <TeamPermissionsModal isOpen={isPermissionsOpen} onClose={() => setIsPermissionsOpen(false)} />
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </>
  );
};

export default Sidebar;

