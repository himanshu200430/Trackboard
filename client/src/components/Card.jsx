import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, AlignLeft, GripVertical } from 'lucide-react';

export const Card = ({ card, onClick, isViewer = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    disabled: isViewer,
    data: {
      type: 'card',
      card,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 180ms cubic-bezier(0.2, 0, 0, 1)',
  };

  // Due date formatting & status
  let dueStatus = 'normal';
  let formattedDue = null;
  if (card.due_date) {
    const dueDate = new Date(card.due_date);
    const now = new Date();
    const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      dueStatus = 'overdue';
    } else if (diffDays <= 2) {
      dueStatus = 'due-soon';
    }

    formattedDue = dueDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`tack-card ${isDragging ? 'card-drag-source' : ''}`}
      onClick={() => onClick(card)}
    >
      {/* Top row: Label chips and Drag Grip */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1 }}>
          {card.labels && card.labels.length > 0 ? (
            card.labels.map((lbl) => (
              <span
                key={lbl.id}
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '3px',
                  backgroundColor: `${lbl.color}20`,
                  color: lbl.color,
                  border: `1px solid ${lbl.color}50`,
                  lineHeight: '1.2',
                }}
              >
                {lbl.name}
              </span>
            ))
          ) : null}
        </div>

        {/* Drag Grip (Only rendered for non-viewers) */}
        {!isViewer && (
          <div
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            style={{
              cursor: 'grab',
              padding: '2px',
              color: 'var(--ink-muted)',
              opacity: 0.6,
              display: 'flex',
              alignItems: 'center',
            }}
            title="Drag to reorder"
          >
            <GripVertical size={13} />
          </div>
        )}
      </div>

      {/* Card Title */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--ink-primary)',
          marginTop: card.labels && card.labels.length > 0 ? '6px' : '0',
          lineHeight: '1.35',
          wordBreak: 'break-word',
        }}
      >
        {card.title}
      </div>

      {/* Card Metadata Footer (Due date, Description indicator) */}
      {(card.due_date || (card.description && card.description.trim())) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '8px',
            paddingTop: '6px',
            borderTop: '1px solid var(--bg-muted)',
            fontSize: '11px',
            color: 'var(--ink-secondary)',
          }}
        >
          {formattedDue && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 5px',
                borderRadius: 'var(--radius-xs)',
                fontWeight: 500,
                backgroundColor:
                  dueStatus === 'overdue'
                    ? '#FEE2E2'
                    : dueStatus === 'due-soon'
                    ? '#FEF3C7'
                    : 'var(--bg-muted)',
                color:
                  dueStatus === 'overdue'
                    ? '#991B1B'
                    : dueStatus === 'due-soon'
                    ? '#92400E'
                    : 'var(--ink-secondary)',
              }}
            >
              <Calendar size={11} />
              {formattedDue}
            </span>
          )}

          {card.description && card.description.trim() && (
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--ink-muted)' }}
              title="Has task description"
            >
              <AlignLeft size={11} />
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Card;

