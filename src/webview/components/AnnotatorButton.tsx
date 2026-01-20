import React from 'react';
import { ControlButton } from 'reactflow';
import { Target, X } from 'lucide-react';

interface AnnotatorButtonProps {
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  disabled?: boolean;
}

/**
 * AnnotatorButton component for toggling annotation selection mode
 * Integrates with ReactFlow Controls and provides visual feedback for selection state
 */
export const AnnotatorButton: React.FC<AnnotatorButtonProps> = ({
  isSelectionMode,
  onToggleSelectionMode,
  disabled = false
}) => {
  const handleClick = () => {
    if (!disabled) {
      onToggleSelectionMode();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Support Enter and Space keys for accessibility
    if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
      event.preventDefault();
      onToggleSelectionMode();
    }
  };

  return (
    <ControlButton
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={isSelectionMode ? "Exit Annotation Mode" : "Enter Annotation Mode"}
      className={`annotator-button ${isSelectionMode ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label={isSelectionMode ? "Exit annotation selection mode" : "Enter annotation selection mode"}
      aria-pressed={isSelectionMode}
    >
      {isSelectionMode ? <X size={16} /> : <Target size={16} />}
      
      <style>{`
        .annotator-button {
          position: relative;
          transition: all 0.2s ease;
        }
        
        .annotator-button.active {
          background-color: #f20d63 !important;
          color: white !important;
          box-shadow: 0 0 8px rgba(242, 13, 99, 0.4);
        }
        
        .annotator-button.active:hover {
          background-color: #d10a56 !important;
          box-shadow: 0 0 12px rgba(242, 13, 99, 0.6);
        }
        
        .annotator-button:not(.active):hover {
          background-color: rgba(242, 13, 99, 0.1) !important;
          color: #f20d63 !important;
        }
        
        .annotator-button.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .annotator-button:focus-visible {
          outline: 2px solid #f20d63;
          outline-offset: 2px;
        }
        
        /* Animation for mode switching */
        .annotator-button svg {
          transition: transform 0.2s ease;
        }
        
        .annotator-button.active svg {
          transform: rotate(90deg);
        }
      `}</style>
    </ControlButton>
  );
};