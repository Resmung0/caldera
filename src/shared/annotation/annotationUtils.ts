import { 
  PipelineAnnotation, 
  AnnotationState, 
  SelectionState, 
  PipelinePatternType,
  AnnotationColorScheme 
} from '../types';
import { 
  DEFAULT_ANNOTATION_COLOR_SCHEME, 
  DEFAULT_ANNOTATION_PREFERENCES,
  ANNOTATION_SYSTEM_VERSION 
} from './annotationConstants';
import { generateAnnotationId, getPatternColor } from './annotationDomain';

/**
 * Creates a new annotation with default values
 */
export function createAnnotation(
  nodeIds: string[],
  patternType: PipelinePatternType,
  patternSubtype: string,
  colorScheme: AnnotationColorScheme = DEFAULT_ANNOTATION_COLOR_SCHEME
): PipelineAnnotation {
  const now = new Date();
  const color = getPatternColor(patternType, patternSubtype, colorScheme);
  
  return {
    id: generateAnnotationId(),
    nodeIds: [...nodeIds], // Create a copy to avoid mutations
    patternType,
    patternSubtype,
    color,
    createdAt: now,
    modifiedAt: now,
  };
}


/**
 * Creates an initial annotation state
 */
export function createInitialAnnotationState(): AnnotationState {
  return {
    annotations: new Map<string, PipelineAnnotation>(),
    selectionState: createInitialSelectionState(),
    uiState: {
      isAnnotationMode: false,
      activeAnnotationId: undefined,
      hoveredAnnotationId: undefined,
    },
    preferences: DEFAULT_ANNOTATION_PREFERENCES,
  };
}

/**
 * Creates an initial selection state
 */
export function createInitialSelectionState(): SelectionState {
  return {
    selectedNodeIds: [],
    isSelectionMode: false,
    pendingAnnotation: undefined,
  };
}

/**
 * Validates if an annotation is valid
 */
export function isValidAnnotation(annotation: Partial<PipelineAnnotation>): annotation is PipelineAnnotation {
  return !!(
    annotation.id &&
    annotation.nodeIds &&
    annotation.nodeIds.length > 0 &&
    annotation.patternType &&
    annotation.patternSubtype &&
    annotation.color &&
    annotation.createdAt &&
    annotation.modifiedAt
  );
}

/**
 * Validates if a selection state allows annotation creation
 */
export function canCreateAnnotation(selectionState: SelectionState): boolean {
  return selectionState.isSelectionMode && selectionState.selectedNodeIds.length > 0;
}

/**
 * Updates an annotation's modified timestamp
 */
export function updateAnnotationTimestamp(annotation: PipelineAnnotation): PipelineAnnotation {
  return {
    ...annotation,
    modifiedAt: new Date(),
  };
}

/**
 * Serializes annotation state for persistence
 */
export function serializeAnnotationState(state: AnnotationState): any {
  return {
    annotations: Array.from(state.annotations.entries()),
    selectionState: state.selectionState,
    uiState: state.uiState,
    preferences: state.preferences,
    version: ANNOTATION_SYSTEM_VERSION,
  };
}

/**
 * Deserializes annotation state from persistence
 */
export function deserializeAnnotationState(data: any): AnnotationState {
  const state = createInitialAnnotationState();
  
  if (data && data.annotations) {
    state.annotations = new Map(data.annotations);
  }
  
  if (data && data.selectionState) {
    state.selectionState = { ...state.selectionState, ...data.selectionState };
  }
  
  if (data && data.uiState) {
    state.uiState = { ...state.uiState, ...data.uiState };
  }
  
  if (data && data.preferences) {
    state.preferences = { ...state.preferences, ...data.preferences };
  }
  
  return state;
}