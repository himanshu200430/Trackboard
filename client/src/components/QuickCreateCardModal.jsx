import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Plus } from 'lucide-react';

export const QuickCreateCardModal = ({
  isOpen,
  onClose,
  lists = [],
  defaultListId = null,
  onCreateCard,
}) => {
  const [selectedListId, setSelectedListId] = useState(defaultListId || (lists[0]?.id || ''));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedListId(defaultListId || (lists[0]?.id || ''));
      setTitle('');
      setDescription('');
    }
  }, [isOpen, defaultListId, lists]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !selectedListId) return;

    onCreateCard(selectedListId, title.trim(), description.trim());
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Card"
      subtitle="Shortcut: 'n' key"
      maxWidth={480}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', display: 'block', marginBottom: '4px' }}>
            List
          </label>
          <select
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            className="select"
            style={{ fontSize: '13px' }}
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', display: 'block', marginBottom: '4px' }}>
            Card Title
          </label>
          <input
            type="text"
            placeholder="e.g. Audit tactile haptic feedback..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            className="input"
            style={{ fontSize: '13px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', display: 'block', marginBottom: '4px' }}>
            Description (Optional)
          </label>
          <textarea
            placeholder="Add details or acceptance criteria..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="textarea"
            style={{ fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            <Plus size={14} />
            <span>Create Card</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default QuickCreateCardModal;

