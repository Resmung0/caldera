import { PipelineNode } from './types';

/**
 * SelectionManager handles multi-node selection logic and state transitions
 * for the pipeline annotation system.
 */
export class SelectionManager {
  private selectedNodes: Set<string> = new Set();
  private isSelectionModeActive: boolean = false;
  private availableNodes: Map<string, PipelineNode> = new Map();
  private listeners: Set<(selectedNodeIds: string[], isSelectionMode: boolean) => void> = new Set();

  constructor(nodes?: PipelineNode[]) {
    if (nodes) {
      this.setAvailableNodes(nodes);
    }
  }

  /**
   * Subscribe to selection changes
   */
  subscribe(listener: (selectedNodeIds: string[], isSelectionMode: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of selection changes
   */
  private notifyListeners(): void {
    const selectedNodeIds = Array.from(this.selectedNodes);
    this.listeners.forEach(listener => listener(selectedNodeIds, this.isSelectionModeActive));
  }

  /**
   * Set available nodes for selection validation
   */
  setAvailableNodes(nodes: PipelineNode[]): void {
    this.availableNodes.clear();
    nodes.forEach(node => {
      this.availableNodes.set(node.id, node);
    });

    // Remove any selected nodes that are no longer available
    const validSelectedNodes = Array.from(this.selectedNodes).filter(nodeId =>
      this.availableNodes.has(nodeId)
    );

    if (validSelectedNodes.length !== this.selectedNodes.size) {
      this.selectedNodes = new Set(validSelectedNodes);
      this.notifyListeners();
    }
  }

  /**
   * Get available nodes
   */
  getAvailableNodes(): PipelineNode[] {
    return Array.from(this.availableNodes.values());
  }

  /**
   * Activate selection mode
   */
  activateSelectionMode(): void {
    if (!this.isSelectionModeActive) {
      this.isSelectionModeActive = true;
      this.notifyListeners();
    }
  }

  /**
   * Deactivate selection mode and clear selection
   */
  deactivateSelectionMode(): void {
    if (this.isSelectionModeActive) {
      this.isSelectionModeActive = false;
      this.selectedNodes.clear();
      this.notifyListeners();
    }
  }

  /**
   * Check if selection mode is active
   */
  isSelectionMode(): boolean {
    return this.isSelectionModeActive;
  }

  /**
   * Validate if a node can be selected
   */
  private validateNodeSelection(nodeId: string): boolean {
    if (!this.isSelectionModeActive) {
      throw new Error('Cannot select nodes when selection mode is not active');
    }

    if (!this.availableNodes.has(nodeId)) {
      throw new Error(`Node '${nodeId}' is not available for selection`);
    }

    return true;
  }

  /**
   * Select a single node (replaces current selection)
   */
  selectNode(nodeId: string): void {
    this.validateNodeSelection(nodeId);

    this.selectedNodes.clear();
    this.selectedNodes.add(nodeId);
    this.notifyListeners();
  }

  /**
   * Select multiple nodes (replaces current selection)
   */
  selectNodes(nodeIds: string[]): void {
    if (!this.isSelectionModeActive) {
      throw new Error('Cannot select nodes when selection mode is not active');
    }

    // Validate all nodes before selecting any
    const invalidNodes = nodeIds.filter(nodeId => !this.availableNodes.has(nodeId));
    if (invalidNodes.length > 0) {
      throw new Error(`Nodes not available for selection: ${invalidNodes.join(', ')}`);
    }

    this.selectedNodes.clear();
    nodeIds.forEach(nodeId => this.selectedNodes.add(nodeId));
    this.notifyListeners();
  }

  /**
   * Add a node to the current selection
   */
  addNodeToSelection(nodeId: string): void {
    this.validateNodeSelection(nodeId);

    if (!this.selectedNodes.has(nodeId)) {
      this.selectedNodes.add(nodeId);
      this.notifyListeners();
    }
  }

  /**
   * Remove a node from the current selection
   */
  removeNodeFromSelection(nodeId: string): void {
    if (this.selectedNodes.has(nodeId)) {
      this.selectedNodes.delete(nodeId);
      this.notifyListeners();
    }
  }

  /**
   * Toggle node selection (add if not selected, remove if selected)
   */
  toggleNodeSelection(nodeId: string): void {
    this.validateNodeSelection(nodeId);

    if (this.selectedNodes.has(nodeId)) {
      this.selectedNodes.delete(nodeId);
    } else {
      this.selectedNodes.add(nodeId);
    }
    this.notifyListeners();
  }

  /**
   * Clear all selected nodes
   */
  clearSelection(): void {
    if (this.selectedNodes.size > 0) {
      this.selectedNodes.clear();
      this.notifyListeners();
    }
  }

  /**
   * Get currently selected node IDs
   */
  getSelectedNodeIds(): string[] {
    return Array.from(this.selectedNodes);
  }

  /**
   * Get currently selected nodes with their data
   */
  getSelectedNodes(): PipelineNode[] {
    return Array.from(this.selectedNodes)
      .map(nodeId => this.availableNodes.get(nodeId))
      .filter((node): node is PipelineNode => node !== undefined);
  }

  /**
   * Check if a node is selected
   */
  isNodeSelected(nodeId: string): boolean {
    return this.selectedNodes.has(nodeId);
  }

  /**
   * Check if any nodes are selected
   */
  hasSelection(): boolean {
    return this.selectedNodes.size > 0;
  }

  /**
   * Get the number of selected nodes
   */
  getSelectionCount(): number {
    return this.selectedNodes.size;
  }

  /**
   * Check if multiple nodes are selected
   */
  hasMultipleSelection(): boolean {
    return this.selectedNodes.size > 1;
  }

  /**
   * Select all available nodes
   */
  selectAllNodes(): void {
    if (!this.isSelectionModeActive) {
      throw new Error('Cannot select nodes when selection mode is not active');
    }

    const allNodeIds = Array.from(this.availableNodes.keys());
    this.selectedNodes = new Set(allNodeIds);
    this.notifyListeners();
  }

  /**
   * Select nodes within a rectangular area (for drag selection)
   */
  selectNodesInArea(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    nodePositions: Map<string, { x: number; y: number }>
  ): void {
    if (!this.isSelectionModeActive) {
      throw new Error('Cannot select nodes when selection mode is not active');
    }

    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);

    const nodesInArea: string[] = [];

    for (const [nodeId, position] of nodePositions) {
      if (this.availableNodes.has(nodeId) &&
        position.x >= minX && position.x <= maxX &&
        position.y >= minY && position.y <= maxY) {
        nodesInArea.push(nodeId);
      }
    }

    if (nodesInArea.length > 0) {
      this.selectNodes(nodesInArea);
    }
  }

  /**
   * Get selection state for persistence or external use
   */
  getSelectionState(): {
    selectedNodeIds: string[];
    isSelectionMode: boolean;
  } {
    return {
      selectedNodeIds: this.getSelectedNodeIds(),
      isSelectionMode: this.isSelectionModeActive
    };
  }

  /**
   * Restore selection state from external source
   */
  restoreSelectionState(state: {
    selectedNodeIds: string[];
    isSelectionMode: boolean;
  }): void {
    this.isSelectionModeActive = state.isSelectionMode;

    if (state.isSelectionMode) {
      // Only restore valid node selections
      const validNodeIds = state.selectedNodeIds.filter(nodeId =>
        this.availableNodes.has(nodeId)
      );
      this.selectedNodes = new Set(validNodeIds);
    } else {
      this.selectedNodes.clear();
    }

    this.notifyListeners();
  }

  /**
   * Validate selection operations
   */
  validateSelection(): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if selection mode is properly set
    if (this.selectedNodes.size > 0 && !this.isSelectionModeActive) {
      errors.push('Nodes are selected but selection mode is not active');
    }

    // Check if all selected nodes are available
    for (const nodeId of this.selectedNodes) {
      if (!this.availableNodes.has(nodeId)) {
        errors.push(`Selected node '${nodeId}' is not available`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get nodes that are connected to the current selection
   */
  getConnectedNodes(edges: Array<{ source: string; target: string }>): PipelineNode[] {
    const selectedNodeIds = this.getSelectedNodeIds();
    const connectedNodeIds = new Set<string>();

    edges.forEach(edge => {
      if (selectedNodeIds.includes(edge.source) && !selectedNodeIds.includes(edge.target)) {
        connectedNodeIds.add(edge.target);
      }
      if (selectedNodeIds.includes(edge.target) && !selectedNodeIds.includes(edge.source)) {
        connectedNodeIds.add(edge.source);
      }
    });

    return Array.from(connectedNodeIds)
      .map(nodeId => this.availableNodes.get(nodeId))
      .filter((node): node is PipelineNode => node !== undefined);
  }

  /**
   * Reset the selection manager to initial state
   */
  reset(): void {
    this.selectedNodes.clear();
    this.isSelectionModeActive = false;
    this.availableNodes.clear();
    this.notifyListeners();
  }
}