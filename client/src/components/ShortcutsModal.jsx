import React from 'react';
import Modal from './Modal';

export const ShortcutsModal = ({ isOpen, onClose }) => {
  const shortcuts = [
    { key: 'n', desc: 'Add new card to the first list' },
    { key: '/', desc: 'Focus search bar to filter cards' },
    { key: 'Esc', desc: 'Close any active panel or modal' },
    { key: '?', desc: 'Show this keyboard shortcuts cheat sheet' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      subtitle="Crafted for fast keyboard navigation"
      maxWidth={420}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {shortcuts.map((s) => (
          <div
            key={s.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: 'var(--bg-canvas)',
              borderRadius: 'var(--radius-sm)',
              border: 'var(--border-hairline)',
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>{s.desc}</span>
            <kbd
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: 'var(--border-hairline)',
                borderRadius: 'var(--radius-xs)',
                boxShadow: '0 1px 1px rgba(0,0,0,0.08)',
                color: 'var(--ink-primary)',
              }}
            >
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default ShortcutsModal;

