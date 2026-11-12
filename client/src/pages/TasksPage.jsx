import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ShortcutsModal from '../components/ShortcutsModal';
import { CheckSquare, Calendar, Clock, MessageSquare, AlertCircle, Search, Filter } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'due_soon' | 'overdue' | 'completed'
  const [search, setSearch] = useState('');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/tasks', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks || []);
        }
      } catch (err) {
        toast.error('Failed to load tasks.');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const now = new Date();

  const filteredTasks = tasks.filter((t) => {
    const isDone = /done|shipped|closed/i.test(t.list_title);
    const dueDate = t.due_date ? new Date(t.due_date) : null;
    const isOverdue = dueDate && dueDate < now && !isDone;
    const isDueSoon = dueDate && dueDate >= now && (dueDate - now) <= 3 * 24 * 60 * 60 * 1000 && !isDone;

    if (filter === 'completed' && !isDone) return false;
    if (filter === 'overdue' && !isOverdue) return false;
    if (filter === 'due_soon' && !isDueSoon) return false;
    if (filter === 'active' && isDone) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.board_title.toLowerCase().includes(q) ||
        t.list_title.toLowerCase().includes(q)
      );
    }

    return true;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column' }}>
      <Navbar onOpenShortcuts={() => setIsShortcutsOpen(false)} />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar onOpenCreateBoard={() => navigate('/')} />

        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', maxWidth: '1100px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h1 className="font-display" style={{ fontSize: '26px', fontWeight: 600 }}>
                Tasks & Work Items
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                All active deliverables across your project workspaces
              </p>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} color="var(--ink-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
                style={{ paddingLeft: '30px', fontSize: '12px', height: '32px' }}
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: 'var(--border-hairline)', paddingBottom: '12px' }}>
            {[
              { id: 'all', label: `All Tasks (${tasks.length})` },
              { id: 'active', label: 'Active' },
              { id: 'due_soon', label: 'Due Soon' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'completed', label: 'Completed' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="btn"
                style={{
                  fontSize: '12px',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  backgroundColor: filter === f.id ? 'var(--accent)' : 'var(--bg-surface-elevated)',
                  color: filter === f.id ? '#FFFFFF' : 'var(--ink-secondary)',
                  borderColor: filter === f.id ? 'var(--accent)' : 'var(--border-hairline)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tasks List */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-muted)' }}>
              Loading tasks across boards...
            </div>
          ) : filteredTasks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredTasks.map((task) => {
                const dueDate = task.due_date ? new Date(task.due_date) : null;
                const isDone = /done|shipped|closed/i.test(task.list_title);
                const isOverdue = dueDate && dueDate < now && !isDone;

                return (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/b/${task.board_id}/c/${task.id}`)}
                    className="task-row"
                    style={{
                      padding: '12px 16px',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      border: 'var(--border-hairline)',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: 'var(--shadow-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'transform 150ms ease, box-shadow 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
                      e.currentTarget.style.borderColor = 'var(--border-strong)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'var(--shadow-subtle)';
                      e.currentTarget.style.borderColor = 'var(--border-hairline)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <CheckSquare size={16} color={isDone ? '#2D5A4C' : 'var(--ink-muted)'} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-primary)', textDecoration: isDone ? 'line-through' : 'none' }}>
                          {task.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '11px', color: 'var(--ink-secondary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: task.board_color || 'var(--accent)' }} />
                            <strong>{task.board_title}</strong>
                          </span>
                          <span>•</span>
                          <span>Stage: {task.list_title}</span>
                          {task.comment_count > 0 && (
                            <>
                              <span>•</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <MessageSquare size={11} /> {task.comment_count}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                      {/* Labels */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {task.labels?.slice(0, 2).map((lbl) => (
                          <span
                            key={lbl.id}
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '3px',
                              backgroundColor: `${lbl.color}20`,
                              color: lbl.color,
                              border: `1px solid ${lbl.color}40`,
                            }}
                          >
                            {lbl.name}
                          </span>
                        ))}
                      </div>

                      {/* Due Date */}
                      {dueDate && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-xs)',
                            backgroundColor: isOverdue ? '#FEE2E2' : 'var(--bg-muted)',
                            color: isOverdue ? '#991B1B' : 'var(--ink-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={11} />
                          {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: 'var(--border-hairline)' }}>
              <CheckSquare size={32} color="var(--ink-muted)" style={{ opacity: 0.5, marginBottom: '8px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>No tasks match your filter</h3>
              <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                Try selecting "All Tasks" or clearing your search.
              </p>
            </div>
          )}
        </main>
      </div>

      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </div>
  );
};

export default TasksPage;

