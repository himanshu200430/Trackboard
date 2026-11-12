import React, { useState, useEffect } from 'react';
import { Calendar, Tag, Archive, Trash2, Sparkles, X, Check, Clock, TrendingUp, BarChart2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import ConfirmModal from './ConfirmModal';
import CardComments from './CardComments';

export const CardDetailModal = ({
  card,
  boardLabels = [],
  boardTitle = '',
  listTitle = '',
  isViewer = false,
  onClose,
  onUpdateCard,
  onDeleteCard,
  onToggleLabel,
  onCreateLabel,
}) => {
  const toast = useToast();
  const [title, setTitle] = useState(card?.title || '');
  const [description, setDescription] = useState(card?.description || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#C85A32');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (card) {
      setTitle(card.title || '');
      setDescription(card.description || '');
      setAiResult(null);
    }
  }, [card]);

  if (!card) return null;

  const handleTitleSave = () => {
    if (title.trim() && title.trim() !== card.title) {
      onUpdateCard(card.id, { title: title.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleDescSave = () => {
    onUpdateCard(card.id, { description: description.trim() });
    setIsEditingDesc(false);
  };

  const handleDueDateChange = (e) => {
    const val = e.target.value;
    onUpdateCard(card.id, { due_date: val ? new Date(val).toISOString() : null });
  };

  const handleArchiveToggle = () => {
    onUpdateCard(card.id, { archived: !card.archived });
    onClose();
  };

  const handleCreateNewCustomLabel = (e) => {
    e.preventDefault();
    if (newLabelName.trim()) {
      onCreateLabel({ name: newLabelName.trim(), color: newLabelColor });
      setNewLabelName('');
    }
  };

  const handleAISummarize = async () => {
    setIsSummarizing(true);
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          card,
          boardTitle,
          listTitle,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiResult(data);
        toast.success('AI summary & progress analysis ready!');
      } else {
        toast.error("Couldn't generate AI summary.");
      }
    } catch (err) {
      toast.error('Network error during AI summarization.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const attachedLabelIds = new Set((card.labels || []).map((l) => l.id));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28, 25, 23, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 1000,
        animation: 'fadeIn 150ms ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: 'var(--bg-surface-elevated)',
          border: 'var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-modal)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: 'var(--border-hairline)',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', marginBottom: '4px' }}>
              in list <strong style={{ color: 'var(--ink-primary)' }}>{listTitle || 'Card'}</strong>
            </div>

            {isEditingTitle && !isViewer ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                autoFocus
                className="input"
                style={{ fontSize: '16px', fontWeight: 600, padding: '4px 8px' }}
              />
            ) : (
              <h2
                onClick={() => {
                  if (!isViewer) setIsEditingTitle(true);
                }}
                style={{
                  fontSize: '17px',
                  fontWeight: 600,
                  cursor: isViewer ? 'default' : 'pointer',
                  lineHeight: '1.3',
                }}
                title={isViewer ? title : 'Click to edit card title'}
              >
                {card.title}
              </h2>
            )}
          </div>

          <button onClick={onClose} className="btn-ghost" style={{ padding: '4px' }}>
            <X size={18} color="var(--ink-muted)" />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', gap: '24px' }}>
          {/* Main Column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Labels Chips */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Labels
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                {card.labels && card.labels.length > 0 ? (
                  card.labels.map((lbl) => (
                    <span
                      key={lbl.id}
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: `${lbl.color}20`,
                        color: lbl.color,
                        border: `1px solid ${lbl.color}60`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {lbl.name}
                      {!isViewer && (
                        <button
                          onClick={() => onToggleLabel(card.id, lbl.id)}
                          style={{ color: lbl.color, padding: 0 }}
                          title="Remove label"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                    No labels attached
                  </span>
                )}
              </div>
            </div>

            {/* Description Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Description
                </span>
                {!isViewer && !isEditingDesc && (
                  <button
                    onClick={() => setIsEditingDesc(true)}
                    className="btn btn-ghost"
                    style={{ fontSize: '11px', padding: '2px 6px' }}
                  >
                    Edit
                  </button>
                )}
              </div>

              {isEditingDesc && !isViewer ? (
                <div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add details, acceptance criteria, or links..."
                    className="textarea"
                    rows={4}
                    autoFocus
                    style={{ fontSize: '13px', lineHeight: '1.5' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button onClick={handleDescSave} className="btn btn-primary" style={{ fontSize: '12px', padding: '5px 10px' }}>
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setDescription(card.description || '');
                        setIsEditingDesc(false);
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '5px 8px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    if (!isViewer) setIsEditingDesc(true);
                  }}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-canvas)',
                    border: 'var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    color: description ? 'var(--ink-primary)' : 'var(--ink-muted)',
                    whiteSpace: 'pre-wrap',
                    minHeight: '60px',
                    cursor: isViewer ? 'default' : 'pointer',
                  }}
                >
                  {description || (isViewer ? 'No description provided.' : 'Click to add a description...')}
                </div>
              )}
            </div>

            {/* AI Summary, Progress Chart & Action Plan */}
            <div style={{ borderTop: 'var(--border-hairline)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Sparkles size={13} color="var(--accent)" />
                  AI Task Summary & Progress Chart
                </span>
                <button
                  onClick={handleAISummarize}
                  disabled={isSummarizing}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 10px', borderColor: 'var(--accent-border)' }}
                >
                  {isSummarizing ? (
                    <>
                      <Sparkles size={12} className="spin" />
                      <span>Analyzing with Groq...</span>
                    </>
                  ) : aiResult ? (
                    'Regenerate Summary'
                  ) : (
                    'Generate AI Summary'
                  )}
                </button>
              </div>

              {aiResult && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    padding: '16px',
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--accent-border)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {/* Progress Gauge & Chart */}
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-xs)',
                      border: 'var(--border-hairline)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <TrendingUp size={12} color="var(--accent)" />
                        Estimated Completion Progress
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                        {aiResult.estimatedProgress || 0}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        height: '8px',
                        backgroundColor: 'var(--bg-muted)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${aiResult.estimatedProgress || 0}%`,
                          backgroundColor:
                            (aiResult.estimatedProgress || 0) >= 80 ? '#2D5A4C' :
                            (aiResult.estimatedProgress || 0) >= 40 ? 'var(--accent)' : '#3F627D',
                          borderRadius: '4px',
                          transition: 'width 500ms cubic-bezier(0.2, 0, 0, 1)',
                        }}
                      />
                    </div>

                    {/* Metric Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--bg-muted)' }}>
                      {aiResult.complexity && (
                        <span className="badge" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--ink-primary)' }}>
                          <strong>Complexity:</strong>&nbsp;{aiResult.complexity}
                        </span>
                      )}
                      {aiResult.estimatedHours && (
                        <span className="badge" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--ink-primary)' }}>
                          <strong>Effort:</strong>&nbsp;~{aiResult.estimatedHours} hrs
                        </span>
                      )}
                      <span className="badge" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                        <strong>Stage:</strong>&nbsp;{listTitle || 'Active'}
                      </span>
                      {aiResult.source && (
                        <span className="badge" style={{ marginLeft: 'auto', backgroundColor: '#EEF2F6', color: '#3F627D' }}>
                          ⚡ {aiResult.source === 'groq-live' ? 'Groq Live' : 'AI Offline'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--accent-light)',
                      border: '1px solid var(--accent-border)',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '12px',
                      lineHeight: '1.5',
                      color: 'var(--ink-primary)',
                    }}
                  >
                    <strong>Executive Summary:</strong>
                    <p style={{ marginTop: '4px' }}>
                      {aiResult.executiveSummary || aiResult.summary}
                    </p>
                  </div>

                  {/* Milestones Progress Breakdown Chart */}
                  {aiResult.milestones && aiResult.milestones.length > 0 && (
                    <div
                      style={{
                        padding: '12px 14px',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderRadius: 'var(--radius-xs)',
                        border: 'var(--border-hairline)',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <BarChart2 size={12} />
                        Milestone Progress Breakdown Chart
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {aiResult.milestones.map((m, idx) => (
                          <div key={idx}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '3px' }}>
                              <span style={{ fontWeight: 500 }}>{m.name}</span>
                              <span style={{ fontSize: '10px', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>
                                {m.percent}% • {m.status}
                              </span>
                            </div>
                            <div style={{ height: '6px', backgroundColor: 'var(--bg-muted)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${m.percent}%`,
                                  backgroundColor: m.percent === 100 ? '#2D5A4C' : 'var(--accent)',
                                  borderRadius: '3px',
                                  transition: 'width 400ms ease',
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Items Checklist */}
                  {aiResult.actionItems && aiResult.actionItems.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} color="#2D5A4C" />
                        Recommended Next Steps
                      </div>
                      <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--ink-secondary)', lineHeight: '1.5' }}>
                        {aiResult.actionItems.map((item, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Key Risks */}
                  {aiResult.keyRisks && aiResult.keyRisks.length > 0 && (
                    <div style={{ padding: '8px 10px', backgroundColor: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: 'var(--radius-xs)', fontSize: '11px', color: '#9A3412' }}>
                      <strong>Key Considerations & Risks:</strong>
                      <ul style={{ paddingLeft: '14px', marginTop: '4px' }}>
                        {aiResult.keyRisks.map((risk, idx) => (
                          <li key={idx}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Team Comments & Suggestions Section */}
            <CardComments cardId={card.id} isViewer={isViewer} />
          </div>

          {/* Sidebar Column */}
          <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Due Date */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
                Due Date
              </label>
              {!isViewer ? (
                <input
                  type="date"
                  value={card.due_date ? new Date(card.due_date).toISOString().split('T')[0] : ''}
                  onChange={handleDueDateChange}
                  className="input"
                  style={{ fontSize: '12px', padding: '5px 8px' }}
                />
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--ink-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={13} color="var(--ink-muted)" />
                  {card.due_date
                    ? new Date(card.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'None'}
                </div>
              )}
            </div>

            {/* Labels Manager (Non-viewers) */}
            {!isViewer && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowLabelPicker((p) => !p)}
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'flex-start', fontSize: '12px', padding: '6px 8px' }}
                >
                  <Tag size={13} />
                  <span>Manage Labels</span>
                </button>

                {showLabelPicker && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 110 }}
                      onClick={() => setShowLabelPicker(false)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '100%',
                        marginTop: '6px',
                        width: '240px',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        border: 'var(--border-hairline)',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: 'var(--shadow-modal)',
                        zIndex: 111,
                        padding: '12px',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Labels</div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                        {boardLabels.map((lbl) => {
                          const isAttached = attachedLabelIds.has(lbl.id);
                          return (
                            <button
                              key={lbl.id}
                              onClick={() => onToggleLabel(card.id, lbl.id)}
                              className="btn-ghost"
                              style={{
                                width: '100%',
                                justifyContent: 'space-between',
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: 'var(--radius-xs)',
                                backgroundColor: isAttached ? 'var(--bg-muted)' : 'transparent',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: lbl.color }} />
                                <span>{lbl.name}</span>
                              </div>
                              {isAttached && <Check size={13} color="var(--accent)" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Create Custom Label */}
                      <form onSubmit={handleCreateNewCustomLabel} style={{ marginTop: '10px', paddingTop: '10px', borderTop: 'var(--border-hairline)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', marginBottom: '4px' }}>New Label</div>
                        <input
                          type="text"
                          placeholder="Label name..."
                          value={newLabelName}
                          onChange={(e) => setNewLabelName(e.target.value)}
                          className="input"
                          style={{ fontSize: '11px', padding: '4px 6px', height: '24px', marginBottom: '6px' }}
                        />
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={newLabelColor}
                            onChange={(e) => setNewLabelColor(e.target.value)}
                            style={{ width: '28px', height: '24px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '3px' }}
                          />
                          <button type="submit" className="btn btn-primary" style={{ flex: 1, fontSize: '11px', padding: '4px 6px' }}>
                            Add
                          </button>
                        </div>
                      </form>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Actions: Archive & Delete (Non-viewers) */}
            {!isViewer && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto', paddingTop: '12px', borderTop: 'var(--border-hairline)' }}>
                <button
                  onClick={handleArchiveToggle}
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'flex-start', fontSize: '12px', padding: '6px 8px' }}
                >
                  <Archive size={13} />
                  <span>{card.archived ? 'Restore from Archive' : 'Archive Card'}</span>
                </button>

                <button
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="btn btn-danger"
                  style={{ width: '100%', justifyContent: 'flex-start', fontSize: '12px', padding: '6px 8px' }}
                >
                  <Trash2 size={13} />
                  <span>Delete Card</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Delete Card Modal */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={() => {
          onDeleteCard(card.id);
          onClose();
        }}
        title="Delete Card"
        message={`Permanently delete "${card.title}"? This cannot be undone.`}
        confirmText="Delete Card"
      />
    </div>
  );
};

export default CardDetailModal;

