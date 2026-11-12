import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import { Users, UserPlus, Mail, Shield, Search, Check, Folder } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const MembersPage = () => {
  const [members, setMembers] = useState([]);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      const [membersRes, boardsRes] = await Promise.all([
        fetch('/api/members', { credentials: 'include' }),
        fetch('/api/boards', { credentials: 'include' }),
      ]);

      if (membersRes.ok) {
        const mData = await membersRes.json();
        setMembers(mData.members || []);
      }
      if (boardsRes.ok) {
        const bData = await boardsRes.json();
        setBoards(bData.boards || []);
        if (bData.boards?.length > 0 && !selectedBoardId) {
          setSelectedBoardId(bData.boards[0].id);
        }
      }
    } catch (err) {
      toast.error('Failed to load team directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedBoardId) {
      toast.error('Email and Project are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/boards/${selectedBoardId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message || 'Collaborator added to project!');
      setIsInviteModalOpen(false);
      setInviteEmail('');
      loadData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner':
        return <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-burnt)', backgroundColor: 'rgba(200, 90, 50, 0.12)', padding: '2px 8px', borderRadius: '10px' }}>Owner</span>;
      case 'member':
        return <span style={{ fontSize: '11px', fontWeight: 600, color: '#2D5A4C', backgroundColor: 'rgba(45, 90, 76, 0.12)', padding: '2px 8px', borderRadius: '10px' }}>Member</span>;
      default:
        return <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', backgroundColor: 'var(--bg-muted)', padding: '2px 8px', borderRadius: '10px' }}>Viewer</span>;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar onOpenCreateBoard={() => navigate('/')} />

        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', maxWidth: '1100px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h1 className="font-display" style={{ fontSize: '26px', fontWeight: 600 }}>
                Team & Collaborators
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                Manage team directory, workspace roles, and project invitations
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} color="var(--ink-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search team members..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '30px', fontSize: '12px', height: '32px' }}
                />
              </div>

              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                <UserPlus size={14} />
                <span>Invite Teammate</span>
              </button>
            </div>
          </div>

          {/* Members List Table / Cards */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-muted)' }}>
              Loading team directory...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: 'var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-burnt)',
                        color: '#FFF',
                        fontWeight: 700,
                        fontSize: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink-primary)' }}>
                        {member.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={12} color="var(--ink-muted)" />
                        <span>{member.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Project Memberships */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', maxWidth: '420px', justifyContent: 'flex-end' }}>
                    {member.memberships?.map((m, idx) => (
                      <div
                        key={idx}
                        onClick={() => navigate(`/b/${m.board_id}`)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          backgroundColor: 'var(--bg-surface)',
                          border: 'var(--border-hairline)',
                          borderRadius: 'var(--radius-xs)',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                        title={`Open ${m.board_title}`}
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: m.board_color || 'var(--accent-burnt)' }} />
                        <span style={{ fontWeight: 500 }}>{m.board_title}</span>
                        {getRoleBadge(m.role)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Clean UI Modal for Inviting Teammate (Zero browser dialogs!) */}
          <Modal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            title="Invite Teammate to Project"
            subtitle="Add a collaborator by email with specific workspace permissions"
            maxWidth={460}
          >
            <form onSubmit={handleInviteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', display: 'block', marginBottom: '4px' }}>
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
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', display: 'block', marginBottom: '4px' }}>
                  Teammate Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. sam@tackboard.dev"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  autoFocus
                  className="input"
                  style={{ fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', display: 'block', marginBottom: '4px' }}>
                  Workspace Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="select"
                  style={{ fontSize: '13px' }}
                >
                  <option value="member">Member — Can create, edit & move cards</option>
                  <option value="viewer">Viewer — Read-only observation</option>
                  <option value="owner">Owner — Full administrative control</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  {submitting ? 'Adding...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </Modal>
        </main>
      </div>
    </div>
  );
};

export default MembersPage;

