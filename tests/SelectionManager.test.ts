import { SelectionManager } from '../src/shared/SelectionManager';
import { PipelineNode } from '../src/shared/types';

describe('SelectionManager', () => {
  let selectionManager: SelectionManager;
  let mockNodes: PipelineNode[];

  beforeEach(() => {
    mockNodes = [
      { id: 'node1', label: 'Node 1', type: 'process' },
      { id: 'node2', label: 'Node 2', type: 'process' },
      { id: 'node3', label: 'Node 3', type: 'process' },
      { id: 'node4', label: 'Node 4', type: 'process' }
    ];
    selectionManager = new SelectionManager(mockNodes);
  });

  describe('Selection Mode Management', () => {
    test('should start with selection mode inactive', () => {
      expect(selectionManager.isSelectionMode()).toBe(false);
    });

    test('should activate selection mode', () => {
      selectionManager.activateSelectionMode();
      expect(selectionManager.isSelectionMode()).toBe(true);
    });

    test('should deactivate selection mode and clear selection', () => {
      selectionManager.activateSelectionMode();
      selectionManager.selectNode('node1');

      selectionManager.deactivateSelectionMode();

      expect(selectionManager.isSelectionMode()).toBe(false);
      expect(selectionManager.getSelectedNodeIds()).toEqual([]);
    });
  });

  describe('Node Selection', () => {
    beforeEach(() => {
      selectionManager.activateSelectionMode();
    });

    test('should select a single node', () => {
      selectionManager.selectNode('node1');

      expect(selectionManager.getSelectedNodeIds()).toEqual(['node1']);
      expect(selectionManager.isNodeSelected('node1')).toBe(true);
    });

    test('should replace selection when selecting a single node', () => {
      selectionManager.selectNode('node1');
      selectionManager.selectNode('node2');

      expect(selectionManager.getSelectedNodeIds()).toEqual(['node2']);
    });

    test('should select multiple nodes', () => {
      selectionManager.selectNodes(['node1', 'node2']);

      expect(selectionManager.getSelectedNodeIds()).toContain('node1');
      expect(selectionManager.getSelectedNodeIds()).toContain('node2');
      expect(selectionManager.getSelectionCount()).toBe(2);
    });

    test('should add node to existing selection', () => {
      selectionManager.selectNode('node1');
      selectionManager.addNodeToSelection('node2');

      expect(selectionManager.getSelectedNodeIds()).toContain('node1');
      expect(selectionManager.getSelectedNodeIds()).toContain('node2');
    });

    test('should not add duplicate node to selection', () => {
      selectionManager.selectNode('node1');
      selectionManager.addNodeToSelection('node1');

      expect(selectionManager.getSelectionCount()).toBe(1);
    });

    test('should remove node from selection', () => {
      selectionManager.selectNodes(['node1', 'node2']);
      selectionManager.removeNodeFromSelection('node1');

      expect(selectionManager.getSelectedNodeIds()).toEqual(['node2']);
    });

    test('should toggle node selection', () => {
      selectionManager.toggleNodeSelection('node1');
      expect(selectionManager.isNodeSelected('node1')).toBe(true);

      selectionManager.toggleNodeSelection('node1');
      expect(selectionManager.isNodeSelected('node1')).toBe(false);
    });

    test('should clear all selection', () => {
      selectionManager.selectNodes(['node1', 'node2']);
      selectionManager.clearSelection();

      expect(selectionManager.getSelectedNodeIds()).toEqual([]);
      expect(selectionManager.hasSelection()).toBe(false);
    });

    test('should select all available nodes', () => {
      selectionManager.selectAllNodes();

      expect(selectionManager.getSelectionCount()).toBe(mockNodes.length);
      mockNodes.forEach(node => {
        expect(selectionManager.isNodeSelected(node.id)).toBe(true);
      });
    });
  });

  describe('Selection Validation', () => {
    test('should throw error when selecting node without active selection mode', () => {
      expect(() => {
        selectionManager.selectNode('node1');
      }).toThrow('Cannot select nodes when selection mode is not active');
    });

    test('should throw error when selecting invalid node', () => {
      selectionManager.activateSelectionMode();

      expect(() => {
        selectionManager.selectNode('invalid-node');
      }).toThrow("Node 'invalid-node' is not available for selection");
    });

    test('should throw error when selecting multiple invalid nodes', () => {
      selectionManager.activateSelectionMode();

      expect(() => {
        selectionManager.selectNodes(['node1', 'invalid-node']);
      }).toThrow('Nodes not available for selection: invalid-node');
    });

    test('should validate selection state', () => {
      selectionManager.activateSelectionMode();
      selectionManager.selectNode('node1');

      const validation = selectionManager.validateSelection();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    test('should detect invalid selection state', () => {
      // Manually create invalid state
      selectionManager.activateSelectionMode();
      selectionManager.selectNode('node1');
      selectionManager.deactivateSelectionMode();
      // Force invalid state by reactivating without clearing
      (selectionManager as any).isSelectionModeActive = false;
      (selectionManager as any).selectedNodes.add('node1');

      const validation = selectionManager.validateSelection();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Node Management', () => {
    test('should update available nodes', () => {
      const newNodes: PipelineNode[] = [
        { id: 'new1', label: 'New Node 1', type: 'process' },
        { id: 'new2', label: 'New Node 2', type: 'process' }
      ];

      selectionManager.setAvailableNodes(newNodes);

      expect(selectionManager.getAvailableNodes()).toEqual(newNodes);
    });

    test('should remove invalid selections when updating available nodes', () => {
      selectionManager.activateSelectionMode();
      selectionManager.selectNodes(['node1', 'node2']);

      const newNodes: PipelineNode[] = [
        { id: 'node1', label: 'Node 1', type: 'process' }
      ];

      selectionManager.setAvailableNodes(newNodes);

      expect(selectionManager.getSelectedNodeIds()).toEqual(['node1']);
    });

    test('should get selected nodes with data', () => {
      selectionManager.activateSelectionMode();
      selectionManager.selectNodes(['node1', 'node2']);

      const selectedNodes = selectionManager.getSelectedNodes();

      expect(selectedNodes).toHaveLength(2);
      expect(selectedNodes[0].label).toBeDefined();
      expect(selectedNodes[1].label).toBeDefined();
    });
  });

  describe('Area Selection', () => {
    test('should select nodes in rectangular area', () => {
      const nodePositions = new Map([
        ['node1', { x: 10, y: 10 }],
        ['node2', { x: 50, y: 50 }],
        ['node3', { x: 100, y: 100 }],
        ['node4', { x: 200, y: 200 }]
      ]);

      selectionManager.activateSelectionMode();
      selectionManager.selectNodesInArea(0, 0, 75, 75, nodePositions);

      const selectedIds = selectionManager.getSelectedNodeIds();
      expect(selectedIds).toContain('node1');
      expect(selectedIds).toContain('node2');
      expect(selectedIds).not.toContain('node3');
      expect(selectedIds).not.toContain('node4');
    });
  });

  describe('Connected Nodes', () => {
    test('should get nodes connected to selection', () => {
      const edges = [
        { source: 'node1', target: 'node2' },
        { source: 'node2', target: 'node3' },
        { source: 'node3', target: 'node4' }
      ];

      selectionManager.activateSelectionMode();
      selectionManager.selectNode('node2');

      const connectedNodes = selectionManager.getConnectedNodes(edges);

      expect(connectedNodes).toHaveLength(2);
      expect(connectedNodes.some(node => node.id === 'node1')).toBe(true);
      expect(connectedNodes.some(node => node.id === 'node3')).toBe(true);
    });
  });

  describe('State Management', () => {
    test('should get selection state', () => {
      selectionManager.activateSelectionMode();
      selectionManager.selectNodes(['node1', 'node2']);

      const state = selectionManager.getSelectionState();

      expect(state.isSelectionMode).toBe(true);
      expect(state.selectedNodeIds).toEqual(['node1', 'node2']);
    });

    test('should restore selection state', () => {
      const state = {
        isSelectionMode: true,
        selectedNodeIds: ['node1', 'node3']
      };

      selectionManager.restoreSelectionState(state);

      expect(selectionManager.isSelectionMode()).toBe(true);
      expect(selectionManager.getSelectedNodeIds()).toEqual(['node1', 'node3']);
    });

    test('should filter invalid nodes when restoring state', () => {
      const state = {
        isSelectionMode: true,
        selectedNodeIds: ['node1', 'invalid-node']
      };

      selectionManager.restoreSelectionState(state);

      expect(selectionManager.getSelectedNodeIds()).toEqual(['node1']);
    });

    test('should reset to initial state', () => {
      selectionManager.activateSelectionMode();
      selectionManager.selectNodes(['node1', 'node2']);

      selectionManager.reset();

      expect(selectionManager.isSelectionMode()).toBe(false);
      expect(selectionManager.getSelectedNodeIds()).toEqual([]);
      expect(selectionManager.getAvailableNodes()).toEqual([]);
    });
  });

  describe('Selection Queries', () => {
    beforeEach(() => {
      selectionManager.activateSelectionMode();
    });

    test('should check if has selection', () => {
      expect(selectionManager.hasSelection()).toBe(false);

      selectionManager.selectNode('node1');
      expect(selectionManager.hasSelection()).toBe(true);
    });

    test('should check if has multiple selection', () => {
      selectionManager.selectNode('node1');
      expect(selectionManager.hasMultipleSelection()).toBe(false);

      selectionManager.addNodeToSelection('node2');
      expect(selectionManager.hasMultipleSelection()).toBe(true);
    });

    test('should get selection count', () => {
      expect(selectionManager.getSelectionCount()).toBe(0);

      selectionManager.selectNodes(['node1', 'node2', 'node3']);
      expect(selectionManager.getSelectionCount()).toBe(3);
    });
  });

  describe('Event Subscription', () => {
    test('should notify listeners on selection changes', () => {
      const listener = jest.fn();
      const unsubscribe = selectionManager.subscribe(listener);

      selectionManager.activateSelectionMode();

      expect(listener).toHaveBeenCalledWith([], true);

      unsubscribe();
    });

    test('should not notify unsubscribed listeners', () => {
      const listener = jest.fn();
      const unsubscribe = selectionManager.subscribe(listener);
      unsubscribe();

      selectionManager.activateSelectionMode();

      expect(listener).not.toHaveBeenCalled();
    });
  });
});