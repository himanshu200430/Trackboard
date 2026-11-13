import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import Card from './Card';
import ConfirmModal from './ConfirmModal';
import { Plus, MoreHorizontal, Trash2, Edit2, GripHorizontal } from 'lucide-react';

export const List = ({
  list,
  cards,
  boardAccent = '#C85A32',
  isViewer = false,
  onCardClick,
  onAddCard,
  onRenameList,
  onDeleteList,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(list.title);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // List sortable (horizontal list reordering)
  const {
    attributes: listAttributes,
    listeners: listListeners,
    setNodeRef: setListNodeRef,
    transform: listTransform,
    transition: listTransition,
    isDragging: isListDragging,
  } = useSortable({
    id: list.id,
    disabled: isViewer,
    data: {
      type: 'list',
      list,
    },
  });

  // Droppable container for dropping cards into an empty list or between cards
  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: `droppable-list-${list.id}`,
    data: {
      type: 'list-droppable',
      listId: list.id,
    },
  });

  const listStyle = {
    transform: CSS.Transform.toString(listTransform),
    transition: listTransition || 'transform 180ms cubic-bezier(0.2, 0, 0, 1)',
  };

  const handleTitleSubmit = (e) => {
    e.preventDefault();
    if (titleInput.trim() && titleInput.trim() !== list.title) {
      onRenameList(list.id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const handleCreateCardSubmit = (e) => {
    e.preventDefault();
    if (newCardTitle.trim()) {
      onAddCard(list.id, newCardTitle.trim());
      setNewCardTitle('');
      setIsAddingCard(false);
    }
  };

  const cardIds = cards.map((c) => c.id);

  return (
    <div
      ref={setListNodeRef}
      style={listStyle}
      className={`tack-list ${isListDragging ? 'list-drag-source' : ''} ${isOver ? 'list-is-over' : ''}`}
    >
      {/* List Header */}
      <div
        className="tack-list-header"
        style={{ borderTop: `3px solid ${boardAccent}` }}
      >
        {/* Left: Drag Handle (non-viewers) & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
          {!isViewer && (
            <div
              {...listAttributes}
              {...listListeners}
              style={{
                cursor: 'grab',
                color: 'var(--ink-muted)',
                opacity: 0.6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 6px',
                minWidth: '24px',
                minHeight: '24px',
                touchAction: 'none',
              }}
              title="Drag list to reorder"
            >
              <GripHorizontal size={15} />
            </div>
          )}

          {isEditingTitle && !isViewer ? (
            <form onSubmit={handleTitleSubmit} style={{ flex: 1 }}>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSubmit}
                autoFocus
                className="input"
                style={{ padding: '2px 6px', fontSize: '13px', height: '26px' }}
              />
            </form>
          ) : (
            <div
              onClick={() => {
                if (!isViewer) setIsEditingTitle(true);
              }}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--ink-primary)',
                cursor: isViewer ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
              }}
              title={isViewer ? list.title : 'Click to rename list'}
            >
              {list.title}
            </div>
          )}

          {/* Card Count Pill */}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-muted)',
              color: 'var(--ink-secondary)',
              flexShrink: 0,
            }}
          >
            {cards.length}
          </span>
        </div>

        {/* Right: List Actions Dropdown (Only for non-viewers) */}
        {!isViewer && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className="btn-ghost"
              style={{ padding: '3px', borderRadius: 'var(--radius-xs)', color: 'var(--ink-secondary)' }}
              title="List options"
            >
              <MoreHorizontal size={15} />
            </button>

            {showMenu && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 100 }}
                  onClick={() => setShowMenu(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '4px',
                    width: '140px',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: 'var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-card-hover)',
                    zIndex: 101,
                    padding: '4px',
                  }}
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setIsEditingTitle(true);
                    }}
                    className="btn-ghost"
                    style={{ width: '100%', justifyContent: 'flex-start', fontSize: '12px', padding: '6px 8px' }}
                  >
                    <Edit2 size={13} />
                    <span>Rename list</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setIsDeleteConfirmOpen(true);
                    }}
                    className="btn-ghost"
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      fontSize: '12px',
                      padding: '6px 8px',
                      color: '#B2433D',
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Delete list</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Cards Scrollable Body */}
      <div
        ref={setDroppableNodeRef}
        className="tack-list-cards"
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.length > 0 ? (
            cards.map((card) => (
              <Card
                key={card.id}
                card={card}
                onClick={onCardClick}
                isViewer={isViewer}
              />
            ))
          ) : (
            /* Thoughtful Empty State */
            <div className="tack-empty-state">
              <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="10" width="32" height="28" rx="3" stroke="#B5AFA6" strokeWidth="2" strokeDasharray="3 3"/>
                <path d="M16 22H32M16 28H26" stroke="#CEC7BB" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p>Nothing here yet. Drop a card in or add one.</p>
            </div>
          )}
        </SortableContext>
      </div>

      {/* List Footer: Add Card (Not rendered for viewers) */}
      {!isViewer && (
        <div className="tack-list-footer">
          {isAddingCard ? (
            <form onSubmit={handleCreateCardSubmit}>
              <textarea
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="Write a task or card title..."
                className="textarea"
                rows={2}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCreateCardSubmit(e);
                  } else if (e.key === 'Escape') {
                    setIsAddingCard(false);
                    setNewCardTitle('');
                  }
                }}
                style={{ fontSize: '13px', resize: 'none', marginBottom: '6px' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '12px', padding: '5px 10px' }}>
                  Add card
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCard(false);
                    setNewCardTitle('');
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '5px 8px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingCard(true)}
              className="btn btn-ghost"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                color: 'var(--ink-secondary)',
                fontSize: '12px',
                padding: '6px 8px',
              }}
            >
              <Plus size={14} />
              <span>Add a card</span>
            </button>
          )}
        </div>
      )}

      {/* Confirm Delete List Modal */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => onDeleteList(list.id)}
        title="Delete List"
        message={`Are you sure you want to delete "${list.title}" and its ${cards.length} cards? This action cannot be undone.`}
        confirmText="Delete List"
      />
    </div>
  );
};

export default List;

