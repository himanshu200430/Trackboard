import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import Navbar from '../components/Navbar';
import List from '../components/List';
import Card from '../components/Card';
import CardDetailModal from '../components/CardDetailModal';
import ShareModal from '../components/ShareModal';
import ShortcutsModal from '../components/ShortcutsModal';
import ConfirmModal from '../components/ConfirmModal';
import QuickCreateCardModal from '../components/QuickCreateCardModal';
import AIBoardInsightsModal from '../components/AIBoardInsightsModal';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import {
  Plus,
  Users,
  Settings,
  Trash2,
  AlertCircle,
  HelpCircle,
  LayoutGrid,
  Sparkles,
} from 'lucide-react';

export const BoardPage = () => {
  const { boardId, cardId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [labels, setLabels] = useState([]);
  const [members, setMembers] = useState([]);
  const [userRole, setUserRole] = useState('viewer');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Modals & Panels state
  const [activeCardId, setActiveCardId] = useState(cardId || null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isQuickCardOpen, setIsQuickCardOpen] = useState(false);
  const [isDeleteBoardConfirmOpen, setIsDeleteBoardConfirmOpen] = useState(false);
  const [isBoardInsightsOpen, setIsBoardInsightsOpen] = useState(false);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  // Drag state
  const [activeDragItem, setActiveDragItem] = useState(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Setup DnD sensors (distance: 4 to allow click vs drag distinction)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  const isViewer = userRole === 'viewer';
  const isOwner = userRole === 'owner';

  // Fetch Board Details
  const fetchBoardData = async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}`, { credentials: 'include' });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to load board.');
      }

      const data = await res.json();
      setBoard(data.board);
      setLists(data.lists || []);
      setCards(data.cards || []);
      setLabels(data.labels || []);
      setMembers(data.members || []);
      setUserRole(data.userRole || 'viewer');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData();
  }, [boardId]);

  // Sync route param cardId with activeCardId
  useEffect(() => {
    if (cardId) {
      setActiveCardId(cardId);
    }
  }, [cardId]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept shortcuts when typing in inputs/textareas
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        if (e.key === 'Escape') {
          e.target.blur();
        }
        return;
      }

      if (e.key === 'n' && !isViewer) {
        e.preventDefault();
        setIsQuickCardOpen(true);
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) searchInput.focus();
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((p) => !p);
      } else if (e.key === 'Escape') {
        if (activeCardId) handleCloseCardModal();
        setIsShareOpen(false);
        setIsSettingsOpen(false);
        setIsShortcutsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isViewer, lists, activeCardId]);

  // Card Modal Open / Close with URL update
  const handleOpenCardModal = (card) => {
    setActiveCardId(card.id);
    navigate(`/b/${boardId}/c/${card.id}`, { replace: false });
  };

  const handleCloseCardModal = () => {
    setActiveCardId(null);
    navigate(`/b/${boardId}`, { replace: true });
  };

  // Add List
  const handleAddList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim() || isViewer) return;

    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ board_id: boardId, title: newListTitle.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLists((prev) => [...prev, data.list]);
      setNewListTitle('');
      setIsAddingList(false);
      toast.success('List created.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Rename List
  const handleRenameList = async (listId, newTitle) => {
    if (isViewer) return;
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: newTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, title: newTitle } : l)));
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Delete List
  const handleDeleteList = async (listId) => {
    if (isViewer) return;
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setLists((prev) => prev.filter((l) => l.id !== listId));
      setCards((prev) => prev.filter((c) => c.list_id !== listId));
      toast.success('List deleted.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Add Card
  const handleAddCard = async (listId, title, description = '') => {
    if (isViewer) return;
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ board_id: boardId, list_id: listId, title, description }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCards((prev) => [...prev, data.card]);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Update Card (Title, Description, Due Date, Archive)
  const handleUpdateCard = async (targetCardId, updates) => {
    if (isViewer) return;
    try {
      const res = await fetch(`/api/cards/${targetCardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCards((prev) => {
        if (updates.archived) {
          // If archived, remove from active board list
          return prev.filter((c) => c.id !== targetCardId);
        }
        return prev.map((c) => (c.id === targetCardId ? data.card : c));
      });
      toast.success('Card updated.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Delete Card
  const handleDeleteCard = async (targetCardId) => {
    if (isViewer) return;
    try {
      const res = await fetch(`/api/cards/${targetCardId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setCards((prev) => prev.filter((c) => c.id !== targetCardId));
      toast.success('Card permanently deleted.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Toggle Label on Card
  const handleToggleLabel = async (targetCardId, labelId) => {
    if (isViewer) return;
    try {
      const res = await fetch(`/api/cards/${targetCardId}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ label_id: labelId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCards((prev) =>
        prev.map((c) => (c.id === targetCardId ? { ...c, labels: data.labels } : c))
      );
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Create Label on Board
  const handleCreateLabel = async ({ name, color }) => {
    if (isViewer) return;
    try {
      const res = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ board_id: boardId, name, color }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLabels((prev) => [...prev, data.label]);
      toast.success(`Label "${name}" created.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Board Settings Update (Owner only)
  const handleUpdateBoard = async (updates) => {
    if (!isOwner) return;
    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBoard(data.board);
      setIsSettingsOpen(false);
      toast.success('Board settings updated.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Delete Board (Owner only)
  const executeDeleteBoard = async () => {
    if (!isOwner) return;

    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success('Board deleted.');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // -------------------------------------------------------------------------
  // DRAG AND DROP HANDLERS (OPTIMISTIC UPDATES + FRACTIONAL INDEXING)
  // -------------------------------------------------------------------------
  const handleDragStart = (event) => {
    if (isViewer) return;
    const { active } = event;
    const activeData = active.data.current;
    setActiveDragItem(activeData);
  };

  const handleDragEnd = async (event) => {
    if (isViewer) return;
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over || active.id === over.id) return;

    const activeType = active.data.current?.type;

    // CASE 1: REORDER LISTS (Horizontal)
    if (activeType === 'list') {
      const oldIndex = lists.findIndex((l) => l.id === active.id);
      const newIndex = lists.findIndex((l) => l.id === over.id);

      if (oldIndex !== newIndex && newIndex !== -1) {
        const previousLists = [...lists];
        const reordered = arrayMove(lists, oldIndex, newIndex);
        setLists(reordered);

        // Compute midpoint fractional position
        let newPos = 1000.0;
        let gap = 1000.0;

        if (newIndex === 0) {
          newPos = reordered[1].position / 2.0;
          gap = reordered[1].position - newPos;
        } else if (newIndex === reordered.length - 1) {
          newPos = reordered[reordered.length - 2].position + 1000.0;
          gap = 1000.0;
        } else {
          const prevPos = reordered[newIndex - 1].position;
          const nextPos = reordered[newIndex + 1].position;
          newPos = (prevPos + nextPos) / 2.0;
          gap = nextPos - prevPos;
        }

        try {
          const res = await fetch(`/api/lists/${active.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ position: newPos, gap }),
          });

          if (!res.ok) throw new Error();
        } catch {
          // Rollback on failure
          setLists(previousLists);
          toast.error("Couldn't save, put it back where it was.");
        }
      }
      return;
    }

    // CASE 2: REORDER / MOVE CARDS (Vertical & Cross-List)
    if (activeType === 'card') {
      const draggedCardId = active.id;
      const draggedCard = cards.find((c) => c.id === draggedCardId);
      if (!draggedCard) return;

      const sourceListId = draggedCard.list_id;

      // Determine target list & target card index
      let targetListId = sourceListId;
      let targetIndex = 0;

      const overData = over.data.current;

      if (overData?.type === 'list-droppable') {
        // Dropped directly on an empty list container
        targetListId = overData.listId;
        const targetCards = cards.filter((c) => c.list_id === targetListId && c.id !== draggedCardId);
        targetIndex = targetCards.length;
      } else if (overData?.type === 'card') {
        // Dropped onto another card
        const overCard = overData.card;
        targetListId = overCard.list_id;
        const targetCards = cards.filter((c) => c.list_id === targetListId && c.id !== draggedCardId);
        const overIndex = targetCards.findIndex((c) => c.id === overCard.id);
        targetIndex = overIndex >= 0 ? overIndex : targetCards.length;
      }

      // Snapshot for optimistic rollback
      const previousCards = [...cards];

      // Get target list existing cards (excluding dragged card)
      const targetListCards = cards
        .filter((c) => c.list_id === targetListId && c.id !== draggedCardId)
        .sort((a, b) => a.position - b.position);

      // Compute fractional index midpoint
      let newPosition = 1000.0;
      let gap = 1000.0;

      if (targetListCards.length === 0) {
        newPosition = 1000.0;
        gap = 1000.0;
      } else if (targetIndex === 0) {
        const firstPos = targetListCards[0].position;
        newPosition = firstPos > 1000.0 ? firstPos - 1000.0 : firstPos / 2.0;
        gap = firstPos - newPosition;
      } else if (targetIndex >= targetListCards.length) {
        const lastPos = targetListCards[targetListCards.length - 1].position;
        newPosition = lastPos + 1000.0;
        gap = 1000.0;
      } else {
        const prevPos = targetListCards[targetIndex - 1].position;
        const nextPos = targetListCards[targetIndex].position;
        newPosition = (prevPos + nextPos) / 2.0;
        gap = nextPos - prevPos;
      }

      // 1. Optimistic State Update
      const updatedCards = cards.map((c) => {
        if (c.id === draggedCardId) {
          return { ...c, list_id: targetListId, position: newPosition };
        }
        return c;
      });
      setCards(updatedCards);

      // 2. Persist in background with ONE parameterized UPDATE query
      try {
        const res = await fetch(`/api/cards/${draggedCardId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            list_id: targetListId,
            position: newPosition,
            gap,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Couldn't save, put it back where it was.");
        }

        const data = await res.json();
        // If rebalance happened, update cards with fresh data from server
        if (data.card) {
          setCards((prev) => prev.map((c) => (c.id === data.card.id ? data.card : c)));
        }
      } catch (err) {
        // Rollback on failure with toast
        console.warn('[Drag Rollback]:', err.message);
        setCards(previousCards);
        toast.error(err.message || "Couldn't save, put it back where it was.");
      }
    }
  };

  // Filter cards by search query
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return cards;
    const q = searchQuery.toLowerCase().trim();
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.labels && c.labels.some((l) => l.name.toLowerCase().includes(q)))
    );
  }, [cards, searchQuery]);

  // Find currently opened card for detail modal
  const activeCard = useMemo(() => {
    if (!activeCardId) return null;
    return cards.find((c) => c.id === activeCardId) || null;
  }, [cards, activeCardId]);

  const activeCardListTitle = useMemo(() => {
    if (!activeCard) return '';
    const l = lists.find((item) => item.id === activeCard.list_id);
    return l ? l.title : '';
  }, [activeCard, lists]);

  // Loading & 404 views
  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)' }}>
        <Navbar />
        <div style={{ maxWidth: '480px', margin: '80px auto', textAlign: 'center', padding: '20px' }}>
          <AlertCircle size={36} color="#B2433D" style={{ marginBottom: '12px' }} />
          <h2 className="font-display" style={{ fontSize: '22px', marginBottom: '8px' }}>
            Board Not Found
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginBottom: '20px' }}>
            This board doesn't exist or you don't have permission to access it.
          </p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading || !board) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)' }}>
        <Navbar />
        <div style={{ display: 'flex', gap: '16px', padding: '24px', overflowX: 'hidden' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="tack-list"
              style={{ height: '400px', backgroundColor: 'var(--bg-surface)' }}
            />
          ))}
        </div>
      </div>
    );
  }

  const listIds = lists.map((l) => l.id);

  return (
    <div className="board-container">
      {/* Navbar with board context & search */}
      <Navbar
        board={board}
        userRole={userRole}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Board Secondary Toolbar */}
      <div className="board-toolbar">
        {/* Left: Board Title & Color dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              backgroundColor: board.color || 'var(--accent)',
            }}
          />
          <h1
            className="font-display"
            style={{ fontSize: '19px', fontWeight: 600, color: 'var(--ink-primary)' }}
          >
            {board.title}
          </h1>
        </div>

        {/* Right: Members, Share button, Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Member Avatars Pile */}
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
            {members.slice(0, 4).map((m, idx) => (
              <div
                key={m.id}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '2px solid var(--bg-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  marginLeft: idx === 0 ? 0 : '-6px',
                  boxShadow: 'var(--shadow-subtle)',
                }}
                title={`${m.name} (${m.role})`}
              >
                {m.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {members.length > 4 && (
              <span style={{ fontSize: '11px', color: 'var(--ink-secondary)', marginLeft: '6px' }}>
                +{members.length - 4}
              </span>
            )}
          </div>

          {/* AI Insights & Charts Button */}
          <button
            onClick={() => setIsBoardInsightsOpen(true)}
            className="btn btn-secondary"
            style={{
              fontSize: '12px',
              padding: '5px 10px',
              borderColor: 'var(--accent-border)',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent)',
              fontWeight: 500,
            }}
            title="AI Board Summary, Progress & Charts"
          >
            <Sparkles size={13} color="var(--accent)" />
            <span>AI Summary & Charts</span>
          </button>

          {/* Share Button (Accessible by all, but only Owner can manage roles) */}
          <button
            onClick={() => setIsShareOpen(true)}
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '5px 10px' }}
          >
            <Users size={13} />
            <span>Share</span>
          </button>

          {/* Board Settings & Delete (Owner only) */}
          {isOwner && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '5px 8px' }}
              title="Board Settings"
            >
              <Settings size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Main Board Canvas with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="board-canvas">
          <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
            {lists.map((list) => {
              const listCards = filteredCards
                .filter((c) => c.list_id === list.id)
                .sort((a, b) => a.position - b.position);

              return (
                <List
                  key={list.id}
                  list={list}
                  cards={listCards}
                  boardAccent={board.color}
                  isViewer={isViewer}
                  onCardClick={handleOpenCardModal}
                  onAddCard={handleAddCard}
                  onRenameList={handleRenameList}
                  onDeleteList={handleDeleteList}
                />
              );
            })}
          </SortableContext>

          {/* Add Another List (Not rendered for viewers) */}
          {!isViewer && (
            <div style={{ width: '280px', minWidth: '280px' }}>
              {isAddingList ? (
                <form
                  onSubmit={handleAddList}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-surface)',
                    border: 'var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-subtle)',
                  }}
                >
                  <input
                    type="text"
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    placeholder="List title..."
                    autoFocus
                    required
                    className="input"
                    style={{ fontSize: '13px', marginBottom: '8px' }}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="submit" className="btn btn-primary" style={{ fontSize: '12px', padding: '5px 10px' }}>
                      Add list
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingList(false);
                        setNewListTitle('');
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
                  onClick={() => setIsAddingList(true)}
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '10px 12px',
                    backgroundColor: 'rgba(255,255,255,0.6)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <Plus size={14} />
                  <span>Add another list</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Drag Overlay with physical rotation and lifted shadow */}
        <DragOverlay>
          {activeDragItem?.type === 'card' ? (
            <div className="card-drag-overlay">
              <Card
                card={activeDragItem.card}
                onClick={() => {}}
                isViewer={false}
              />
            </div>
          ) : activeDragItem?.type === 'list' ? (
            <div style={{ opacity: 0.85, width: '290px' }}>
              <div
                className="tack-list-header"
                style={{
                  borderTop: `3px solid ${board.color}`,
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-lifted)',
                }}
              >
                <span style={{ fontWeight: 600 }}>{activeDragItem.list.title}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Card Detail Modal */}
      {activeCard && (
        <CardDetailModal
          card={activeCard}
          boardLabels={labels}
          boardTitle={board.title}
          listTitle={activeCardListTitle}
          isViewer={isViewer}
          onClose={handleCloseCardModal}
          onUpdateCard={handleUpdateCard}
          onDeleteCard={handleDeleteCard}
          onToggleLabel={handleToggleLabel}
          onCreateLabel={handleCreateLabel}
        />
      )}

      {/* Share & Role Management Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        boardId={boardId}
        members={members}
        userRole={userRole}
        onMemberUpdated={fetchBoardData}
      />

      {/* Board Settings Modal (Owner Only) */}
      {isOwner && (
        <Modal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          title="Board Settings"
          subtitle="Manage title, color, or delete this board"
          maxWidth={460}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', display: 'block', marginBottom: '6px' }}>
                Board Title
              </label>
              <input
                type="text"
                defaultValue={board.title}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value.trim() !== board.title) {
                    handleUpdateBoard({ title: e.target.value.trim() });
                  }
                }}
                className="input"
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', display: 'block', marginBottom: '6px' }}>
                Accent Color
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  defaultValue={board.color}
                  onChange={(e) => handleUpdateBoard({ color: e.target.value })}
                  style={{ width: '40px', height: '32px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                />
                <span style={{ fontSize: '12px', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {board.color}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: 'var(--border-hairline)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#B2433D', marginBottom: '4px' }}>
                Danger Zone
              </div>
              <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginBottom: '10px' }}>
                Deleting this board removes all associated lists, cards, and labels permanently.
              </p>
              <button
                onClick={() => setIsDeleteBoardConfirmOpen(true)}
                className="btn btn-danger"
                style={{ fontSize: '12px' }}
              >
                <Trash2 size={13} />
                <span>Delete Board</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Quick Create Card Modal (Triggered by 'n' key) */}
      <QuickCreateCardModal
        isOpen={isQuickCardOpen}
        onClose={() => setIsQuickCardOpen(false)}
        lists={lists}
        onCreateCard={(targetListId, title, desc) => {
          handleAddCard(targetListId, title, desc);
        }}
      />

      {/* Confirm Board Deletion Modal */}
      <ConfirmModal
        isOpen={isDeleteBoardConfirmOpen}
        onClose={() => setIsDeleteBoardConfirmOpen(false)}
        onConfirm={executeDeleteBoard}
        title="Delete Board"
        message={`Permanently delete "${board?.title}"? All associated lists, cards, and labels will be deleted immediately.`}
        confirmText="Delete Board"
      />

      {/* AI Board Insights & Charts Modal */}
      <AIBoardInsightsModal
        isOpen={isBoardInsightsOpen}
        onClose={() => setIsBoardInsightsOpen(false)}
        boardTitle={board?.title}
        lists={lists}
        cards={cards}
        labels={labels}
      />

      {/* Shortcuts Cheat Sheet */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
};

export default BoardPage;

