import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, Shield, LifeBuoy, Check, Mail, Lock, Key, Phone, PhoneCall, Trash2, UserPlus, Users, AlertCircle } from 'lucide-react';

export const AccountSettingsModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');

  const handleSave = (e) => {
    e.preventDefault();
    toast.success('Account profile preferences saved.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Account Settings"
      subtitle="Manage your profile and workspace preferences"
      maxWidth={460}
    >
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', display: 'block', marginBottom: '4px' }}>
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            required
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', display: 'block', marginBottom: '4px' }}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="input"
            style={{ backgroundColor: 'var(--bg-muted)', opacity: 0.8 }}
          />
        </div>

        <div style={{ padding: '12px', backgroundColor: 'var(--bg-canvas)', borderRadius: 'var(--radius-sm)', border: 'var(--border-hairline)', fontSize: '12px', color: 'var(--ink-secondary)', lineHeight: '1.4' }}>
          <strong>Session Details:</strong>
          <div style={{ marginTop: '4px' }}>Logged in with secure httpOnly cookie session. Account verified.</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const TeamPermissionsModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('controls'); // 'controls' | 'matrix'
  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);

  // Fetch all boards on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchBoards = async () => {
      try {
        const res = await fetch('/api/boards', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const bList = data.boards || [];
          setBoards(bList);
          if (bList.length > 0 && !selectedBoardId) {
            setSelectedBoardId(bList[0].id);
          }
        }
      } catch (err) {
        toast.error('Failed to load project boards.');
      }
    };

    fetchBoards();
  }, [isOpen]);

  // Fetch board details & members whenever selectedBoardId changes
  useEffect(() => {
    if (!selectedBoardId || !isOpen) return;

    const fetchBoardDetail = async () => {
      setLoadingMembers(true);
      try {
        const res = await fetch(`/api/boards/${selectedBoardId}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members || []);
        }
      } catch (err) {
        toast.error('Failed to load board collaborators.');
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchBoardDetail();
  }, [selectedBoardId, isOpen]);

  const selectedBoard = boards.find((b) => b.id === selectedBoardId);
  const isOwner = selectedBoard?.user_role === 'owner';

  // Owner action: Change member role
  const handleRoleChange = async (memberUserId, newRole, memberName) => {
    if (!isOwner) {
      toast.error('Only the project owner can change team controls.');
      return;
    }

    try {
      const res = await fetch(`/api/boards/${selectedBoardId}/members/${memberUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Optimistic update
      setMembers((prev) =>
        prev.map((m) => (m.id === memberUserId ? { ...m, role: newRole } : m))
      );
      toast.success(data.message || `Updated ${memberName}'s role to ${newRole}.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Owner action: Remove member
  const handleRemoveMember = async (memberUserId, memberName) => {
    if (!isOwner) {
      toast.error('Only the project owner can remove team members.');
      return;
    }

    try {
      const res = await fetch(`/api/boards/${selectedBoardId}/members/${memberUserId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMembers((prev) => prev.filter((m) => m.id !== memberUserId));
      toast.success(data.message || `Removed ${memberName} from project.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Owner action: Invite collaborator directly
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedBoardId) return;

    setInviting(true);
    try {
      const res = await fetch(`/api/boards/${selectedBoardId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message || 'Collaborator added.');
      setInviteEmail('');
      if (data.member) {
        setMembers((prev) => [...prev, data.member]);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setInviting(false);
    }
  };

  const rolesMatrix = [
    {
      role: 'Owner',
      badge: 'role-owner',
      desc: 'Full administrative control. Can invite/remove collaborators, change roles, rename or permanently delete boards.',
      capabilities: ['Change team controls & member roles', 'Invite & remove collaborators', 'Create & delete boards', 'Full card & list CRUD', 'Access AI insights'],
    },
    {
      role: 'Member',
      badge: 'role-member',
      desc: 'Active team collaborator. Can create, edit, reorder cards and lists, participate in discussions, and add tags.',
      capabilities: ['Create, edit & move cards', 'Add comments & suggestions', 'Create & reorder lists', 'Manage card tags'],
    },
    {
      role: 'Viewer',
      badge: 'role-viewer',
      desc: 'Read-only stakeholder. Can browse boards, review cards, inspect discussions, and view analytics.',
      capabilities: ['Browse cards & boards', 'Read discussions & files', 'Drag handles not rendered', 'Server returns 403 on writes'],
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Team Permissions & Access Control"
      subtitle="Manage workspace permissions, member roles, and security hierarchy"
      maxWidth={580}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: 'var(--border-hairline)', gap: '16px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('controls')}
            style={{
              padding: '6px 2px 10px 2px',
              borderBottom: activeTab === 'controls' ? '2px solid var(--accent-burnt)' : '2px solid transparent',
              fontWeight: activeTab === 'controls' ? 600 : 500,
              color: activeTab === 'controls' ? 'var(--ink-primary)' : 'var(--ink-secondary)',
              backgroundColor: 'transparent',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Shield size={14} color={activeTab === 'controls' ? 'var(--accent-burnt)' : 'var(--ink-muted)'} />
            <span>Team Access Control</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            style={{
              padding: '6px 2px 10px 2px',
              borderBottom: activeTab === 'matrix' ? '2px solid var(--accent-burnt)' : '2px solid transparent',
              fontWeight: activeTab === 'matrix' ? 600 : 500,
              color: activeTab === 'matrix' ? 'var(--ink-primary)' : 'var(--ink-secondary)',
              backgroundColor: 'transparent',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Key size={14} color={activeTab === 'matrix' ? 'var(--accent-burnt)' : 'var(--ink-muted)'} />
            <span>RBAC Matrix</span>
          </button>
        </div>

        {activeTab === 'controls' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Board Selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-secondary)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Project Workspace
                </label>
                <select
                  value={selectedBoardId}
                  onChange={(e) => setSelectedBoardId(e.target.value)}
                  className="select"
                  style={{ fontSize: '13px' }}
                >
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.user_role === 'owner' ? 'Owner' : b.user_role === 'member' ? 'Member' : 'Viewer'})
                    </option>
                  ))}
                </select>
              </div>

              {selectedBoard && (
                <div style={{ alignSelf: 'flex-end', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: '10px',
                      backgroundColor: isOwner ? 'rgba(200, 90, 50, 0.12)' : 'var(--bg-muted)',
                      color: isOwner ? 'var(--accent-burnt)' : 'var(--ink-secondary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Shield size={11} />
                    Your Role: {selectedBoard.user_role?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Owner banner */}
            {isOwner ? (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'rgba(200, 90, 50, 0.08)',
                  border: '1px solid rgba(200, 90, 50, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  color: 'var(--ink-primary)',
                  lineHeight: '1.4',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Shield size={16} color="var(--accent-burnt)" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Owner Control Active:</strong> You have full administrative control to promote, demote, or manage collaborator roles below.
                </span>
              </div>
            ) : (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-surface)',
                  border: 'var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  color: 'var(--ink-secondary)',
                  lineHeight: '1.4',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} color="var(--ink-muted)" style={{ flexShrink: 0 }} />
                <span>
                  You have <strong>{selectedBoard?.user_role}</strong> permissions on this project. Only project owners can modify collaborator roles.
                </span>
              </div>
            )}

            {/* Owner Quick Invite Bar */}
            {isOwner && (
              <form onSubmit={handleInvite} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="email"
                  placeholder="Invite by email (e.g. sam@tackboard.dev)..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="input"
                  style={{ flex: 1, fontSize: '12px', height: '32px' }}
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="select"
                  style={{ width: '110px', fontSize: '12px', height: '32px' }}
                >
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                  <option value="owner">Owner</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', height: '32px', padding: '0 10px', whiteSpace: 'nowrap' }}
                >
                  <UserPlus size={13} />
                  <span>{inviting ? 'Adding...' : 'Add Member'}</span>
                </button>
              </form>
            )}

            {/* Members Control List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
              {loadingMembers ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '12px' }}>
                  Loading collaborators...
                </div>
              ) : members.length > 0 ? (
                members.map((member) => {
                  const isCurrentSessionUser = member.id === user?.id;

                  return (
                    <div
                      key={member.id}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: 'var(--bg-surface)',
                        border: 'var(--border-hairline)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      {/* Left: User details */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--accent-burnt)',
                            color: '#FFF',
                            fontWeight: 600,
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {member.name}
                            </span>
                            {isCurrentSessionUser && (
                              <span style={{ fontSize: '10px', color: 'var(--ink-muted)', fontWeight: 400 }}>(You)</span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {member.email}
                          </div>
                        </div>
                      </div>

                      {/* Right: Role Control */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isOwner ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value, member.name)}
                            className="select"
                            style={{
                              fontSize: '12px',
                              height: '30px',
                              padding: '2px 8px',
                              fontWeight: 500,
                              borderColor: member.role === 'owner' ? 'var(--accent-burnt)' : 'var(--border-hairline)',
                            }}
                          >
                            <option value="owner">Owner (Full Admin)</option>
                            <option value="member">Member (Can Edit)</option>
                            <option value="viewer">Viewer (Read-Only)</option>
                          </select>
                        ) : (
                          <span className={`badge role-badge role-${member.role}`} style={{ fontSize: '11px' }}>
                            {member.role?.toUpperCase()}
                          </span>
                        )}

                        {isOwner && !isCurrentSessionUser && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id, member.name)}
                            className="btn-ghost"
                            style={{ padding: '6px', color: '#B2433D' }}
                            title={`Remove ${member.name} from project`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '12px' }}>
                  No collaborators found on this board.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* RBAC Matrix Tab */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rolesMatrix.map((r) => (
              <div
                key={r.role}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-surface)',
                  border: 'var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className={`badge role-badge ${r.badge}`} style={{ fontSize: '12px' }}>
                    <Shield size={11} style={{ marginRight: 3 }} />
                    {r.role}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginBottom: '8px', lineHeight: '1.4' }}>
                  {r.desc}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                  {r.capabilities.map((cap, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--ink-primary)' }}>
                      <Check size={11} color="var(--accent-burnt)" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export const SupportModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Help & Customer Care Support"
      subtitle="Direct workspace assistance and technical contact"
      maxWidth={480}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Prominent Customer Care Card with phone note */}
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: 'rgba(45, 90, 76, 0.08)',
            border: '1.5px solid #2D5A4C',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PhoneCall size={18} color="#2D5A4C" />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#2D5A4C' }}>
              Customer Care & Technical Helpline
            </span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--ink-primary)', lineHeight: '1.5', margin: 0 }}>
            Have questions regarding team permissions, project setups, database migrations, or live assistance?
          </p>

          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-xs)',
              border: 'var(--border-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Direct Phone Support
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink-primary)', marginTop: '2px' }}>
                call our customer care no <span style={{ color: 'var(--accent-burnt)' }}>9300293940</span>
              </div>
            </div>

            <a
              href="tel:9300293940"
              className="btn btn-primary"
              style={{
                fontSize: '12px',
                padding: '6px 12px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
              }}
            >
              <Phone size={13} />
              <span>Call Now</span>
            </a>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--ink-secondary)' }}>
            Operating hours: Monday – Saturday, 9:00 AM – 8:00 PM IST
          </div>
        </div>

        {/* Quick Keyboard Shortcuts */}
        <div style={{ padding: '12px', backgroundColor: 'var(--bg-canvas)', borderRadius: 'var(--radius-sm)', border: 'var(--border-hairline)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Quick Keyboard Shortcuts</div>
          <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', lineHeight: '1.5', margin: 0 }}>
            Press <kbd style={{ padding: '1px 5px', background: '#fff', border: '1px solid #ccc', borderRadius: 3 }}>n</kbd> for new card,{' '}
            <kbd style={{ padding: '1px 5px', background: '#fff', border: '1px solid #ccc', borderRadius: 3 }}>/</kbd> to search, and{' '}
            <kbd style={{ padding: '1px 5px', background: '#fff', border: '1px solid #ccc', borderRadius: 3 }}>Esc</kbd> to close open dialogs.
          </p>
        </div>

        {/* AI Integration Help */}
        <div style={{ padding: '12px', backgroundColor: 'rgba(200, 90, 50, 0.08)', border: '1px solid rgba(200, 90, 50, 0.25)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-burnt)', marginBottom: '4px' }}>AI Sprint Intelligence</div>
          <p style={{ fontSize: '12px', color: 'var(--ink-primary)', lineHeight: '1.5', margin: 0 }}>
            Groq high-speed LLM inference is configured in your server `.env`. Tasks and project boards can be analyzed with live completion progress charts!
          </p>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--ink-secondary)' }}>
          <strong>Version:</strong> Tackboard Studio v2.4 (React 18 + Node Express + PostgreSQL)
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
          <button onClick={onClose} className="btn btn-primary" style={{ fontSize: '12px' }}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default {
  AccountSettingsModal,
  TeamPermissionsModal,
  SupportModal,
};
