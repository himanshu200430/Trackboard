import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import ShortcutsModal from '../components/ShortcutsModal';
import { useToast } from '../context/ToastContext';
import { Plus, LayoutGrid, Users, CheckSquare, Shield, Clock } from 'lucide-react';

const BOARD_PALETTE = [
  { name: 'Warm Terracotta', hex: '#C85A32' },
  { name: 'Deep Forest', hex: '#2D5A4C' },
  { name: 'Dusty Cobalt', hex: '#3F627D' },
  { name: 'Ochre Mustard', hex: '#B87B28' },
  { name: 'Slate Plum', hex: '#7E4E76' },
  { name: 'Sage Olive', hex: '#617A55' },
  { name: 'Crimson Clay', hex: '#9E3B4E' },
  { name: 'Charcoal Slate', hex: '#4A5568' },
];

export const DashboardPage = () => {
  const toast = useToast();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(BOARD_PALETTE[0].hex);
  const [creating, setCreating] = useState(false);

  const fetchBoards = async () => {
    try {
      const res = await fetch('/api/boards', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setBoards(data.boards);
      } else {
        toast.error('Failed to load boards.');
      }
    } catch (err) {
      toast.error('Network error loading dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newTitle.trim(),
          color: selectedColor,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create board.');
      }

      toast.success('Board created successfully!');
      setNewTitle('');
      setIsCreateOpen(false);
      fetchBoards();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column' }}>
      <Navbar onOpenShortcuts={() => setIsShortcutsOpen(true)} />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar onOpenCreateBoard={() => setIsCreateOpen(true)} />

        <main className="main-content">
        {/* Header */}
        <div className="responsive-header">
          <div>
            <h1 className="font-display" style={{ fontSize: '28px', fontWeight: 600 }}>
              Workspaces & Boards
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
              Select a project board to view cards, manage workflows, or collaborate.
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary"
            style={{ padding: '8px 14px' }}
          >
            <Plus size={15} />
            <span>New Board</span>
          </button>
        </div>

        {/* Dashboard Grid */}
        {loading ? (
          /* Skeletons */
          <div className="dashboard-grid">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="board-card"
                style={{ height: '130px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)' }}
              >
                <div style={{ height: '18px', width: '60%', backgroundColor: 'var(--bg-muted)', borderRadius: '3px' }} />
                <div style={{ height: '12px', width: '40%', backgroundColor: 'var(--bg-muted)', borderRadius: '3px', marginTop: '10px' }} />
              </div>
            ))}
          </div>
        ) : boards.length > 0 ? (
          <div className="dashboard-grid">
            {boards.map((b) => (
              <Link
                key={b.id}
                to={`/b/${b.id}`}
                className="board-card"
              >
                <div
                  className="board-card-accent-bar"
                  style={{ backgroundColor: b.color || 'var(--accent)' }}
                />

                {/* Top Section */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className={`badge role-badge role-${b.user_role || 'member'}`}>
                      <Shield size={10} style={{ marginRight: 2 }} />
                      {b.user_role}
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
                    {b.title}
                  </h3>
                </div>

                {/* Metadata Footer */}
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
                    {b.list_count || 0} lists
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CheckSquare size={12} color="var(--ink-muted)" />
                    {b.card_count || 0} cards
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: 'auto' }}>
                    <Users size={12} color="var(--ink-muted)" />
                    {b.member_count || 1} members
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* Empty Dashboard */
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: 'var(--border-hairline)',
              marginTop: '20px',
            }}
          >
            <h3 className="font-display" style={{ fontSize: '18px', marginBottom: '6px' }}>
              No boards yet
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginBottom: '16px' }}>
              Create your first Tackboard project to start organizing tasks and cards.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="btn btn-primary"
            >
              <Plus size={15} />
              <span>Create First Board</span>
            </button>
          </div>
        )}
      </main>
      </div>

      {/* Create Board Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Board"
        subtitle="Give your project a name and distinct accent color"
        maxWidth={460}
      >
        <form onSubmit={handleCreateBoard} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', display: 'block', marginBottom: '6px' }}>
              Board Title
            </label>
            <input
              type="text"
              placeholder="e.g. Acme Website Redesign"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              autoFocus
              className="input"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', display: 'block', marginBottom: '8px' }}>
              Color Accent
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {BOARD_PALETTE.map((c) => {
                const isSelected = selectedColor === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSelectedColor(c.hex)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-xs)',
                      border: isSelected ? `2px solid ${c.hex}` : '1px solid var(--border-hairline)',
                      backgroundColor: isSelected ? 'var(--bg-muted)' : 'var(--bg-surface)',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: c.hex }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="btn btn-primary"
            >
              {creating ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </form>
      </Modal>

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
};

export default DashboardPage;

