import React, { useState, useEffect } from 'react';
import { MessageSquare, Lightbulb, CheckCircle2, Trash2, Send, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const CardComments = ({ cardId, isViewer = false }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [commentType, setCommentType] = useState('comment'); // 'comment' | 'suggestion' | 'feedback'
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/cards/${cardId}/comments`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [cardId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || isViewer) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/cards/${cardId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: content.trim(),
          type: commentType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setComments((prev) => [...prev, data.comment]);
      setContent('');
      toast.success(commentType === 'suggestion' ? 'Suggestion posted!' : 'Comment added.');
    } catch (err) {
      toast.error(err.message || 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const res = await fetch(`/api/cards/${cardId}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success('Comment removed.');
    } catch (err) {
      toast.error(err.message);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: 'var(--border-hairline)', paddingTop: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <MessageSquare size={13} color="var(--accent)" />
          <span>Team Discussion & Suggestions ({comments.length})</span>
        </div>
      </div>

      {/* Composer (non-viewers) */}
      {!isViewer && (
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '12px',
            backgroundColor: 'var(--bg-canvas)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {/* Type Selector (Comment vs Suggestion vs Feedback) */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => setCommentType('comment')}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
                border: commentType === 'comment' ? '1px solid #3F627D' : '1px solid var(--border-hairline)',
                backgroundColor: commentType === 'comment' ? '#EEF2F6' : '#FFFFFF',
                color: commentType === 'comment' ? '#3F627D' : 'var(--ink-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <MessageSquare size={11} />
              <span>Comment</span>
            </button>

            <button
              type="button"
              onClick={() => setCommentType('suggestion')}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
                border: commentType === 'suggestion' ? '1px solid #B87B28' : '1px solid var(--border-hairline)',
                backgroundColor: commentType === 'suggestion' ? '#FEF3C7' : '#FFFFFF',
                color: commentType === 'suggestion' ? '#92400E' : 'var(--ink-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Lightbulb size={11} />
              <span>Suggestion</span>
            </button>

            <button
              type="button"
              onClick={() => setCommentType('feedback')}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
                border: commentType === 'feedback' ? '1px solid #2D5A4C' : '1px solid var(--border-hairline)',
                backgroundColor: commentType === 'feedback' ? '#EAF3EE' : '#FFFFFF',
                color: commentType === 'feedback' ? '#2D5A4C' : 'var(--ink-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle2 size={11} />
              <span>Feedback</span>
            </button>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              commentType === 'suggestion'
                ? 'Suggest an improvement, solution, or architecture alternative...'
                : commentType === 'feedback'
                ? 'Share test results, review feedback, or verification notes...'
                : 'Write a comment or update for the team...'
            }
            rows={2}
            className="textarea"
            style={{ fontSize: '13px', lineHeight: '1.4', resize: 'vertical', marginBottom: '8px' }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="btn btn-primary"
              style={{ fontSize: '12px', padding: '5px 12px' }}
            >
              <Send size={12} />
              <span>{commentType === 'suggestion' ? 'Add Suggestion' : 'Post Comment'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {comments.map((c) => {
          const isSuggestion = c.type === 'suggestion';
          const isFeedback = c.type === 'feedback';
          const isAuthor = user?.id === c.user_id;

          return (
            <div
              key={c.id}
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: 'var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-subtle)',
              }}
            >
              {/* Comment Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--bg-muted)',
                      border: 'var(--border-hairline)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--ink-primary)',
                    }}
                  >
                    {c.user_name?.charAt(0).toUpperCase()}
                  </div>

                  <span style={{ fontSize: '12px', fontWeight: 600 }}>{c.user_name}</span>

                  {/* Type Badge */}
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: '3px',
                      backgroundColor: isSuggestion
                        ? '#FEF3C7'
                        : isFeedback
                        ? '#EAF3EE'
                        : '#EEF2F6',
                      color: isSuggestion
                        ? '#92400E'
                        : isFeedback
                        ? '#2D5A4C'
                        : '#3F627D',
                      border: isSuggestion
                        ? '1px solid #FCD34D'
                        : isFeedback
                        ? '1px solid #A7F3D0'
                        : '1px solid #BFDBFE',
                      textTransform: 'capitalize',
                    }}
                  >
                    {c.type}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                    {formatTimeAgo(c.created_at)}
                  </span>
                  {(isAuthor || user?.role === 'owner') && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="btn-ghost"
                      style={{ padding: '2px', color: 'var(--ink-muted)' }}
                      title="Delete comment"
                    >
                      <Trash2 size={12} color="#B2433D" />
                    </button>
                  )}
                </div>
              </div>

              {/* Comment Body */}
              <p style={{ fontSize: '13px', color: 'var(--ink-primary)', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                {c.content}
              </p>
            </div>
          );
        })}

        {comments.length === 0 && !loading && (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '12px', fontStyle: 'italic' }}>
            No comments or suggestions on this card yet. Start the conversation!
          </div>
        )}
      </div>
    </div>
  );
};

export default CardComments;

