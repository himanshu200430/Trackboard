import React, { useState } from 'react';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import { UserPlus, Trash2, Shield } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const ShareModal = ({
  isOpen,
  onClose,
  boardId,
  members = [],
  userRole = 'member',
  onMemberUpdated,
}) => {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  const isOwner = userRole === 'owner';

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to invite member.');
      }

      toast.success(data.message || 'Collaborator added!');
      setEmail('');
      onMemberUpdated();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      const res = await fetch(`/api/boards/${boardId}/members/${targetUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update member role.');
      }

      toast.success(data.message || 'Role updated.');
      onMemberUpdated();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const executeRemoveMember = async (targetUserId) => {
    try {
      const res = await fetch(`/api/boards/${boardId}/members/${targetUserId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove member.');
      }

      toast.success('Member removed.');
      onMemberUpdated();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Board Collaborators & Roles"
      subtitle="Invite teammates and configure access permissions"
      maxWidth={520}
    >
      {/* Invite Form (Owner Only) */}
      {isOwner ? (
        <form onSubmit={handleInvite} style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '6px' }}>
            Invite by Email
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
              style={{ flex: 1, fontSize: '13px' }}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="select"
              style={{ width: '100px', fontSize: '12px' }}
            >
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
              <option value="owner">Owner</option>
            </select>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              <UserPlus size={14} />
              <span>Invite</span>
            </button>
          </div>
        </form>
      ) : (
        <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-canvas)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--ink-secondary)', marginBottom: '16px' }}>
          Only the board owner can invite new members or change permission tiers.
        </div>
      )}

      {/* Members List */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '8px' }}>
          Active Members ({members.length})
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
          {members.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                border: 'var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{m.email}</div>
                </div>
              </div>

              {/* Role Selection or Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isOwner && m.role !== 'owner' ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.id, e.target.value)}
                    className="select"
                    style={{ fontSize: '11px', padding: '2px 6px', height: '26px' }}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="member">Member</option>
                    <option value="owner">Owner</option>
                  </select>
                ) : (
                  <span className={`badge role-badge role-${m.role}`}>
                    <Shield size={10} style={{ marginRight: 2 }} />
                    {m.role}
                  </span>
                )}

                {isOwner && m.role !== 'owner' && (
                  <button
                    onClick={() => setMemberToRemove({ id: m.id, name: m.name })}
                    className="btn-ghost"
                    style={{ padding: '4px', color: 'var(--ink-muted)' }}
                    title="Remove collaborator"
                  >
                    <Trash2 size={13} color="#B2433D" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm Remove Member Modal */}
      <ConfirmModal
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        onConfirm={() => executeRemoveMember(memberToRemove?.id)}
        title="Remove Collaborator"
        message={`Are you sure you want to remove ${memberToRemove?.name} from this board? They will lose access immediately.`}
        confirmText="Remove Collaborator"
      />
    </Modal>
  );
};

export default ShareModal;

