import {
  PipelineAnnotation,
  AnnotationState,
  PipelinePatternType,
  AnnotationColorScheme
} from '../types';
import {
  generateAnnotationId,
  getPatternColor,
} from './annotationDomain';
import { isValidAnnotation } from './annotationUtils';

/**
 * AnnotationStore manages the state and operations for pipeline annotations.
 * Handles CRUD operations, selection state, and persistence logic.
 */
export class AnnotationStore {
  private state: AnnotationState;
  private listeners: Set<(state: AnnotationState) => void> = new Set();

  constructor(initialState?: Partial<AnnotationState>) {
    this.state = {
      annotations: new Map<string, PipelineAnnotation>(),
      selectionState: {
        selectedNodeIds: [],
        isSelectionMode: false,
        pendingAnnotation: undefined
      },
      uiState: {
        isAnnotationMode: false,
        activeAnnotationId: undefined,
        hoveredAnnotationId: undefined
      },
      preferences: {
        colorScheme: this.getDefaultColorScheme(),
        showLabels: true,
        animationEnabled: true
      },
      ...initialState
    };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: AnnotationState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current state (read-only)
   */
  getState(): Readonly<AnnotationState> {
    return { ...this.state };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<AnnotationState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  // === ANNOTATION CRUD OPERATIONS ===

  /**
   * Create a new annotation
   */
  createAnnotation(
    nodeIds: string[],
    patternType: PipelinePatternType,
    patternSubtype: string,
    label?: string
  ): string {
    if (nodeIds.length === 0) {
      throw new Error('Cannot create annotation with empty node selection');
    }

    const id = this.generateAnnotationId();
    const color = this.getColorForPattern(patternType, patternSubtype);
    const now = new Date();

    const annotation: PipelineAnnotation = {
      id,
      nodeIds: [...nodeIds],
      patternType,
      patternSubtype,
      color,
      label,
      createdAt: now,
      modifiedAt: now
    };

    const newAnnotations = new Map(this.state.annotations);
    newAnnotations.set(id, annotation);

    this.updateState({
      annotations: newAnnotations,
      selectionState: {
        ...this.state.selectionState,
        selectedNodeIds: [],
        pendingAnnotation: undefined
      }
    });

    return id;
  }

  /**
   * Get annotation by ID
   */
  getAnnotation(id: string): PipelineAnnotation | undefined {
    return this.state.annotations.get(id);
  }

  /**
   * Get all annotations
   */
  getAllAnnotations(): PipelineAnnotation[] {
    return Array.from(this.state.annotations.values());
  }

  /**
   * Update an existing annotation
   */
  updateAnnotation(id: string, updates: Partial<Omit<PipelineAnnotation, 'id' | 'createdAt'>>): boolean {
    const existing = this.state.annotations.get(id);
    if (!existing) {
      return false;
    }

    const updatedAnnotation: PipelineAnnotation = {
      ...existing,
      ...updates,
      modifiedAt: new Date()
    };

    const newAnnotations = new Map(this.state.annotations);
    newAnnotations.set(id, updatedAnnotation);

    this.updateState({ annotations: newAnnotations });
    return true;
  }

  /**
   * Delete an annotation
   */
  deleteAnnotation(id: string): boolean {
    if (!this.state.annotations.has(id)) {
      return false;
    }

    const newAnnotations = new Map(this.state.annotations);
    newAnnotations.delete(id);

    this.updateState({
      annotations: newAnnotations,
      uiState: {
        ...this.state.uiState,
        activeAnnotationId: this.state.uiState.activeAnnotationId === id ? undefined : this.state.uiState.activeAnnotationId,
        hoveredAnnotationId: this.state.uiState.hoveredAnnotationId === id ? undefined : this.state.uiState.hoveredAnnotationId
      }
    });
    return true;
  }

  /**
   * Add nodes to an existing annotation
   */
  addNodesToAnnotation(annotationId: string, nodeIds: string[]): boolean {
    const annotation = this.state.annotations.get(annotationId);
    if (!annotation) {
      return false;
    }

    const uniqueNodeIds = Array.from(new Set([...annotation.nodeIds, ...nodeIds]));
    return this.updateAnnotation(annotationId, { nodeIds: uniqueNodeIds });
  }

  /**
   * Remove nodes from an existing annotation
   */
  removeNodesFromAnnotation(annotationId: string, nodeIds: string[]): boolean {
    const annotation = this.state.annotations.get(annotationId);
    if (!annotation) {
      return false;
    }

    const filteredNodeIds = annotation.nodeIds.filter(id => !nodeIds.includes(id));

    // If no nodes remain, delete the annotation
    if (filteredNodeIds.length === 0) {
      return this.deleteAnnotation(annotationId);
    }

    return this.updateAnnotation(annotationId, { nodeIds: filteredNodeIds });
  }

  // === SELECTION STATE MANAGEMENT ===

  /**
   * Set selection mode
   */
  setSelectionMode(isSelectionMode: boolean): void {
    this.updateState({
      selectionState: {
        ...this.state.selectionState,
        isSelectionMode,
        selectedNodeIds: isSelectionMode ? this.state.selectionState.selectedNodeIds : [],
        pendingAnnotation: isSelectionMode ? this.state.selectionState.pendingAnnotation : undefined
      }
    });
  }

  /**
   * Select nodes
   */
  selectNodes(nodeIds: string[]): void {
    this.updateState({
      selectionState: {
        ...this.state.selectionState,
        selectedNodeIds: [...nodeIds]
      }
    });
  }

  /**
   * Add node to selection
   */
  addNodeToSelection(nodeId: string): void {
    if (!this.state.selectionState.selectedNodeIds.includes(nodeId)) {
      this.updateState({
        selectionState: {
          ...this.state.selectionState,
          selectedNodeIds: [...this.state.selectionState.selectedNodeIds, nodeId]
        }
      });
    }
  }

  /**
   * Remove node from selection
   */
  removeNodeFromSelection(nodeId: string): void {
    this.updateState({
      selectionState: {
        ...this.state.selectionState,
        selectedNodeIds: this.state.selectionState.selectedNodeIds.filter(id => id !== nodeId)
      }
    });
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.updateState({
      selectionState: {
        ...this.state.selectionState,
        selectedNodeIds: [],
        pendingAnnotation: undefined
      }
    });
  }

  /**
   * Set pending annotation for creation
   */
  setPendingAnnotation(annotation: Partial<PipelineAnnotation>): void {
    this.updateState({
      selectionState: {
        ...this.state.selectionState,
        pendingAnnotation: annotation
      }
    });
  }

  // === UI STATE MANAGEMENT ===

  /**
   * Set annotation mode
   */
  setAnnotationMode(isAnnotationMode: boolean): void {
    this.updateState({
      uiState: {
        ...this.state.uiState,
        isAnnotationMode
      }
    });
  }

  /**
   * Set active annotation
   */
  setActiveAnnotation(annotationId?: string): void {
    this.updateState({
      uiState: {
        ...this.state.uiState,
        activeAnnotationId: annotationId
      }
    });
  }

  /**
   * Set hovered annotation
   */
  setHoveredAnnotation(annotationId?: string): void {
    this.updateState({
      uiState: {
        ...this.state.uiState,
        hoveredAnnotationId: annotationId
      }
    });
  }

  // === PERSISTENCE LOGIC ===

  /**
   * Serialize annotations for persistence
   */
  serializeAnnotations(): string {
    const data = {
      annotations: Array.from(this.state.annotations.entries()),
      preferences: this.state.preferences,
      version: '1.0.0'
    };
    return JSON.stringify(data);
  }

  /**
   * Load annotations from serialized data
   */
  loadAnnotations(serializedData: string): boolean {
    try {
      const data = JSON.parse(serializedData);

      if (!data.annotations || !Array.isArray(data.annotations)) {
        return false;
      }

      const annotations = new Map<string, PipelineAnnotation>();
      for (const [id, annotation] of data.annotations) {
        // Validate annotation structure
        if (isValidAnnotation(annotation)) {
          annotations.set(id, {
            ...annotation,
            createdAt: new Date(annotation.createdAt),
            modifiedAt: new Date(annotation.modifiedAt)
          });
        }
      }

      this.updateState({
        annotations,
        preferences: data.preferences ? { ...this.state.preferences, ...data.preferences } : this.state.preferences
      });

      return true;
    } catch (error) {
      console.error('Failed to load annotations:', error);
      return false;
    }
  }

  /**
   * Clear all annotations
   */
  clearAllAnnotations(): void {
    this.updateState({
      annotations: new Map(),
      selectionState: {
        selectedNodeIds: [],
        isSelectionMode: false,
        pendingAnnotation: undefined
      },
      uiState: {
        isAnnotationMode: false,
        activeAnnotationId: undefined,
        hoveredAnnotationId: undefined
      }
    });
  }

  // === UTILITY METHODS ===

  /**
   * Generate unique annotation ID
   */
  private generateAnnotationId(): string {
    return generateAnnotationId();
  }

  /**
   * Get color for pattern type and subtype
   */
  getColorForPattern(patternType: PipelinePatternType, patternSubtype: string): string {
    return getPatternColor(patternType, patternSubtype, this.state.preferences.colorScheme);
  }

  /**
   * Get default color scheme
   */
  private getDefaultColorScheme(): AnnotationColorScheme {
    return {
      [PipelinePatternType.CICD]: {
        testing: '#3b82f6',
        build: '#1d4ed8'
      },
      [PipelinePatternType.DATA_PROCESSING]: {
        modelInference: '#10b981',
        modelTraining: '#059669',
        etl: '#047857',
        webscraping: '#065f46'
      },
      [PipelinePatternType.AI_AGENT]: {
        promptChaining: '#8b5cf6',
        routing: '#7c3aed',
        parallelization: '#6d28d9',
        orchestratorWorkers: '#5b21b6',
        evaluatorOptimizer: '#4c1d95'
      },
      [PipelinePatternType.RPA]: {
        browseAutomation: '#f59e0b'
      }
    };
  }

  /**
   * Get annotations containing specific node
   */
  getAnnotationsForNode(nodeId: string): PipelineAnnotation[] {
    return this.getAllAnnotations().filter(annotation =>
      annotation.nodeIds.includes(nodeId)
    );
  }

  /**
   * Check if nodes are already annotated
   */
  areNodesAnnotated(nodeIds: string[]): boolean {
    return nodeIds.some(nodeId => this.getAnnotationsForNode(nodeId).length > 0);
  }

  /**
   * Update preferences
   */
  updatePreferences(preferences: Partial<AnnotationState['preferences']>): void {
    this.updateState({
      preferences: {
        ...this.state.preferences,
        ...preferences
      }
    });
  }

  canCreateAnnotation(): boolean {
    const { isSelectionMode, selectedNodeIds } = this.state.selectionState;
    return isSelectionMode && selectedNodeIds.length > 0;
  }
}