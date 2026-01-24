import { useEffect, useState, useCallback } from 'react';
import { SelectionManager } from '../../shared/selection/SelectionManager';
import { createInitialSelectionState, SelectionState } from '../../shared/types';

export function useSelection(dataNodes: { id: string }[]) {
  const [selectionManager] = useState(() => new SelectionManager());
  const [selectionState, setSelectionState] =
    useState<SelectionState>(createInitialSelectionState());
  const [selectionBox, setSelectionBox] = useState<{
    startX: number; startY: number; endX: number; endY: number;
  } | null>(null);

  // subscribe manager → state
  useEffect(() => {
    const unsubscribe = selectionManager.subscribe((selectedNodeIds, isSelectionMode) => {
      setSelectionState(prev => ({ ...prev, selectedNodeIds, isSelectionMode }));
    });
    return unsubscribe;
  }, [selectionManager]);

  // keep available nodes in sync
  useEffect(() => {
    if (dataNodes.length > 0) selectionManager.setAvailableNodes(dataNodes);
  }, [dataNodes, selectionManager]);

  // keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectionState.isSelectionMode) return;
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          selectionManager.deactivateSelectionMode();
          break;
        case 'a':
        case 'A':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            selectionManager.selectAllNodes();
          }
          break;
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          selectionManager.clearSelection();
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectionState.isSelectionMode, selectionManager]);

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent) => {
      if (selectionState.isSelectionMode && event.target === event.currentTarget) {
        selectionManager.clearSelection();
        setSelectionBox(null);
      }
    },
    [selectionState.isSelectionMode, selectionManager],
  );

  const toggleSelectionMode = () => {
    if (selectionState.isSelectionMode) {
      selectionManager.deactivateSelectionMode();
      setSelectionBox(null);
    } else {
      setSelectionBox(null);
      selectionManager.activateSelectionMode();
    }
  };

  return {
    selectionManager,
    selectionState,
    selectionBox,
    setSelectionBox,
    handleCanvasClick,
    toggleSelectionMode,
  };
}
