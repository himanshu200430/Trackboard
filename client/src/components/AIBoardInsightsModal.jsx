import React, { useState } from 'react';
import Modal from './Modal';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle, BarChart3, Clock, Tag } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const AIBoardInsightsModal = ({
  isOpen,
  onClose,
  boardTitle = '',
  lists = [],
  cards = [],
  labels = [],
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/board-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          boardTitle,
          lists,
          cards,
          labels,
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(result.error || 'Failed to generate board insights.');
      }

      setData(result);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when modal opens if data is empty
  React.useEffect(() => {
    if (isOpen && !data && !loading) {
      fetchInsights();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const stats = data?.stats;
  const insights = data?.insights;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Board Insights & Progress Analytics"
      subtitle={`AI synthesis powered by Groq for "${boardTitle}"`}
      maxWidth={720}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Sparkles size={28} color="var(--accent)" style={{ animation: 'spin 2s linear infinite', marginBottom: '12px' }} />
          <h4 style={{ fontSize: '15px', fontWeight: 600 }}>Analyzing board workflows with Groq...</h4>
          <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
            Evaluating completion velocity, stage distribution, and sprint bottlenecks.
          </p>
        </div>
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Progress Card */}
          <div
            style={{
              padding: '16px 18px',
              backgroundColor: 'var(--bg-canvas)',
              border: 'var(--border-hairline)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Overall Board Progress
              </span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>
                {stats?.progressPercent}% Completed
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div
              style={{
                height: '10px',
                backgroundColor: 'var(--bg-muted)',
                borderRadius: '5px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${stats?.progressPercent}%`,
                  backgroundColor: 'var(--accent)',
                  borderRadius: '5px',
                  transition: 'width 600ms cubic-bezier(0.2, 0, 0, 1)',
                }}
              />
            </div>

            {/* Sub-stats row */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                marginTop: '12px',
                fontSize: '12px',
                color: 'var(--ink-secondary)',
              }}
            >
              <span><strong>{stats?.completedCards}</strong> of <strong>{stats?.totalCards}</strong> cards delivered</span>
              <span>•</span>
              <span><strong>{stats?.stageBreakdown?.length}</strong> active workflow stages</span>
              {stats?.overdueCount > 0 && (
                <>
                  <span>•</span>
                  <span style={{ color: '#B2433D', fontWeight: 600 }}>
                    {stats.overdueCount} overdue item{stats.overdueCount > 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* AI Executive Assessment */}
          {insights && (
            <div
              style={{
                padding: '16px 18px',
                backgroundColor: 'var(--accent-light)',
                border: '1px solid var(--accent-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={15} color="var(--accent)" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
                    Executive Health Assessment
                  </span>
                </div>
                {insights.projectHealth && (
                  <span
                    className="badge"
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent-border)',
                      fontWeight: 600,
                    }}
                  >
                    {insights.projectHealth}
                  </span>
                )}
              </div>

              <p style={{ fontSize: '13px', color: 'var(--ink-primary)', lineHeight: '1.5' }}>
                {insights.executiveSummary}
              </p>

              {insights.velocityStatus && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--ink-secondary)' }}>
                  <strong>Throughput:</strong> {insights.velocityStatus}
                </div>
              )}
            </div>
          )}

          {/* Pipeline Stage Distribution Chart */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart3 size={14} />
              Pipeline Stage Distribution
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats?.stageBreakdown?.map((stage) => (
                <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '110px', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {stage.title}
                  </span>

                  <div style={{ flex: 1, height: '18px', backgroundColor: 'var(--bg-canvas)', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${stage.percentage}%`,
                        backgroundColor:
                          /done|shipped|closed/i.test(stage.title) ? '#2D5A4C' :
                          /progress|dev/i.test(stage.title) ? '#C85A32' :
                          /review/i.test(stage.title) ? '#B87B28' : '#3F627D',
                        borderRadius: '3px',
                        minWidth: stage.count > 0 ? '6px' : '0',
                        transition: 'width 400ms ease',
                      }}
                    />
                  </div>

                  <span style={{ width: '60px', textAlign: 'right', fontSize: '11px', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {stage.count} ({stage.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations & Bottlenecks Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Bottlenecks */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-surface)',
                border: 'var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#B2433D', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                <AlertTriangle size={13} />
                Identified Bottlenecks
              </div>
              <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--ink-secondary)', lineHeight: '1.5' }}>
                {insights?.bottlenecks?.map((b, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{b}</li>
                )) || <li>No current workflow bottlenecks detected.</li>}
              </ul>
            </div>

            {/* Strategic Recommendations */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-surface)',
                border: 'var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#2D5A4C', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                <TrendingUp size={13} />
                Strategic Priorities
              </div>
              <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--ink-secondary)', lineHeight: '1.5' }}>
                {insights?.strategicRecommendations?.map((r, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{r}</li>
                )) || <li>Continue advancing active cards through the review pipeline.</li>}
              </ul>
            </div>
          </div>

          {/* Label Distribution Chips Chart */}
          {stats?.labelDistribution && stats.labelDistribution.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Tag size={13} />
                Workstream Label Distribution
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {stats.labelDistribution.map((lbl) => (
                  <div
                    key={lbl.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: `${lbl.color}15`,
                      border: `1px solid ${lbl.color}40`,
                      fontSize: '11px',
                      color: 'var(--ink-primary)',
                    }}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: lbl.color }} />
                    <span style={{ fontWeight: 500 }}>{lbl.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: lbl.color }}>
                      {lbl.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: 'var(--border-hairline)' }}>
            <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
              Model: {data.model || 'Groq llama / gpt-oss'}
            </span>
            <button
              onClick={fetchInsights}
              disabled={loading}
              className="btn btn-secondary"
              style={{ fontSize: '12px' }}
            >
              <Sparkles size={13} />
              <span>Refresh Insights</span>
            </button>
          </div>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '36px 20px' }}>
          <AlertTriangle size={32} color="#B2433D" style={{ marginBottom: '12px' }} />
          <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink-primary)' }}>AI Generation Error</h4>
          <p style={{ fontSize: '13px', color: '#B2433D', marginTop: '6px', maxWidth: '480px', margin: '6px auto 16px', lineHeight: '1.5' }}>
            {error}
          </p>
          <button
            onClick={fetchInsights}
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            Retry AI Analysis
          </button>
        </div>
      ) : null}
    </Modal>
  );
};

export default AIBoardInsightsModal;

