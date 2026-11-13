import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { BarChart3, TrendingUp, CheckCircle, Clock, AlertTriangle, Sparkles, Folder, ArrowRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const ReportsPage = () => {
  const [boards, setBoards] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiReport, setAiReport] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [boardsRes, tasksRes] = await Promise.all([
          fetch('/api/boards', { credentials: 'include' }),
          fetch('/api/tasks', { credentials: 'include' }),
        ]);

        if (boardsRes.ok) {
          const bData = await boardsRes.json();
          setBoards(bData.boards || []);
        }
        if (tasksRes.ok) {
          const tData = await tasksRes.json();
          setTasks(tData.tasks || []);
        }
      } catch (err) {
        toast.error('Failed to load performance metrics.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalCards = tasks.length;
  const completedCards = tasks.filter((t) => /done|shipped|closed/i.test(t.list_title)).length;
  const now = new Date();
  const overdueCards = tasks.filter((t) => {
    const isDone = /done|shipped|closed/i.test(t.list_title);
    return t.due_date && new Date(t.due_date) < now && !isDone;
  }).length;

  const completionPct = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;

  const handleGenerateAIOverview = async () => {
    if (boards.length === 0) return;
    setAiLoading(true);
    try {
      // Analyze primary active board with AI
      const targetBoard = boards[0];
      const res = await fetch(`/api/ai/board-summary?boardId=${targetBoard.id}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAiReport(data);
      toast.success('Generated AI Executive Project Assessment!');
    } catch (err) {
      toast.error('AI Assessment failed: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar onOpenCreateBoard={() => navigate('/')} />

        <main className="main-content">
          {/* Header */}
          <div className="responsive-header">
            <div>
              <h1 className="font-display" style={{ fontSize: '26px', fontWeight: 600 }}>
                Sprint Reports & Analytics
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                Delivery health, completion velocity, and AI project intelligence
              </p>
            </div>

            <button
              onClick={handleGenerateAIOverview}
              disabled={aiLoading || boards.length === 0}
              className="btn btn-primary"
              style={{ fontSize: '12px', padding: '6px 14px', gap: '6px', whiteSpace: 'nowrap' }}
            >
              <Sparkles size={14} />
              <span>{aiLoading ? 'Analyzing sprint data...' : 'Generate Executive AI Report'}</span>
            </button>
          </div>

          {/* Metric Stat Cards */}
          <div className="stats-grid-4">
            <div style={{ backgroundColor: 'var(--bg-surface-elevated)', border: 'var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: '16px', boxShadow: 'var(--shadow-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>
                Overall Completion
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-burnt)', marginTop: '4px' }}>
                {completionPct}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                {completedCards} of {totalCards} items shipped
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface-elevated)', border: 'var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: '16px', boxShadow: 'var(--shadow-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>
                Active Work Items
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--ink-primary)', marginTop: '4px' }}>
                {totalCards - completedCards}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                In flight across {boards.length} projects
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface-elevated)', border: 'var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: '16px', boxShadow: 'var(--shadow-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>
                Overdue Bottlenecks
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: overdueCards > 0 ? '#B2433D' : '#2D5A4C', marginTop: '4px' }}>
                {overdueCards}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                {overdueCards === 0 ? 'All milestones on schedule' : 'Needs team triage'}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface-elevated)', border: 'var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: '16px', boxShadow: 'var(--shadow-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>
                Workspaces
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#3F627D', marginTop: '4px' }}>
                {boards.length}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                Integrated project boards
              </div>
            </div>
          </div>

          {/* AI Executive Report (If Generated) */}
          {aiReport && (
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--accent-burnt)',
                borderRadius: 'var(--radius-sm)',
                padding: '20px',
                marginBottom: '24px',
                boxShadow: 'var(--shadow-lifted)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="var(--accent-burnt)" />
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                    AI Executive Sprint Health Assessment
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: aiReport.health === 'Healthy' ? 'rgba(45, 90, 76, 0.12)' : 'rgba(200, 90, 50, 0.12)',
                    color: aiReport.health === 'Healthy' ? '#2D5A4C' : 'var(--accent-burnt)',
                  }}
                >
                  Health: {aiReport.health || 'Optimal'}
                </span>
              </div>

              <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--ink-secondary)', marginBottom: '14px' }}>
                {aiReport.narrative}
              </p>

              {aiReport.risks?.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#B2433D', marginBottom: '6px' }}>
                    Identified Delivery Risks & Bottlenecks:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--ink-secondary)' }}>
                    {aiReport.risks.map((risk, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Project Breakdown Table */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              border: 'var(--border-hairline)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-subtle)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '14px 18px', borderBottom: 'var(--border-hairline)', backgroundColor: 'var(--bg-surface)', fontWeight: 600, fontSize: '13px' }}>
              Project Breakdown & Health
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {boards.map((board) => {
                const bCards = tasks.filter((t) => t.board_id === board.id);
                const bCompleted = bCards.filter((t) => /done|shipped|closed/i.test(t.list_title)).length;
                const bPct = bCards.length > 0 ? Math.round((bCompleted / bCards.length) * 100) : 0;

                return (
                  <div
                    key={board.id}
                    onClick={() => navigate(`/b/${board.id}`)}
                    style={{
                      padding: '14px 18px',
                      borderBottom: 'var(--border-hairline)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background-color 120ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <span
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '3px',
                          backgroundColor: board.color || 'var(--accent-burnt)',
                        }}
                      />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink-primary)' }}>
                          {board.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                          {board.list_count || 0} lists • {board.card_count || bCards.length} cards • {board.member_count || 1} members
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '220px' }}>
                      <div
                        style={{
                          flex: 1,
                          height: '7px',
                          backgroundColor: 'var(--bg-muted)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${bPct}%`,
                            height: '100%',
                            backgroundColor: board.color || 'var(--accent-burnt)',
                            borderRadius: '4px',
                            transition: 'width 300ms ease',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '35px', textAlign: 'right' }}>
                        {bPct}%
                      </span>
                    </div>

                    <ArrowRight size={15} color="var(--ink-muted)" style={{ marginLeft: '16px' }} />
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReportsPage;

