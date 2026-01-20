export interface PipelineNode {
    id: string;
    label: string;
    type?: string;
    status?: 'idle' | 'running' | 'success' | 'failed';
    data?: any;
}

export interface PipelineEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
}

export interface PipelineData {
    filePath: string;
    framework: string;
    nodes: PipelineNode[];
    edges: PipelineEdge[];
    category?: string;
    tools?: string[];
}

export type ExtensionMessage =
    | { type: 'updatePipeline'; data: PipelineData; availablePipelines: string[] }
    | { type: 'setLoading'; isLoading: boolean }
    | { type: 'error'; message: string };

export type WebViewMessage =
    | { type: 'webviewReady' }
    | { type: 'selectPipeline', filePath: string }
    | { type: 'selectCategory', category: string };

export enum PipelineType {
  CICD = 'cicd',
  DataProcessing = 'data-processing',
  AIAgent = 'ai-agent',
  RPA = 'rpa',
}

// Annotation-related types and interfaces

export enum PipelinePatternType {
  CICD = 'cicd',
  DATA_PROCESSING = 'data-processing',
  AI_AGENT = 'ai-agent',
  RPA = 'rpa'
}

export interface PipelineAnnotation {
  id: string;
  nodeIds: string[];
  patternType: PipelinePatternType;
  patternSubtype: string;
  color: string;
  label?: string;
  createdAt: Date;
  modifiedAt: Date;
}

export interface AnnotationBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  padding: number;
}

export interface SelectionState {
  selectedNodeIds: string[];
  isSelectionMode: boolean;
  pendingAnnotation?: Partial<PipelineAnnotation>;
}

export interface AnnotationColorScheme {
  [PipelinePatternType.CICD]: {
    testing: string;
    build: string;
  };
  [PipelinePatternType.DATA_PROCESSING]: {
    modelInference: string;
    modelTraining: string;
    etlElt: string;
    webscraping: string;
  };
  [PipelinePatternType.AI_AGENT]: {
    promptChaining: string;
    routing: string;
    parallelization: string;
    orchestratorWorkers: string;
    evaluatorOptimizer: string;
  };
  [PipelinePatternType.RPA]: {
    browseAutomation: string;
  };
}

export interface AnnotationState {
  annotations: Map<string, PipelineAnnotation>;
  selectionState: SelectionState;
  uiState: {
    isAnnotationMode: boolean;
    activeAnnotationId?: string;
    hoveredAnnotationId?: string;
  };
  preferences: {
    colorScheme: AnnotationColorScheme;
    showLabels: boolean;
    animationEnabled: boolean;
  };
}

export interface AnnotatedPipeline extends PipelineData {
  annotations: PipelineAnnotation[];
  annotationMetadata: {
    version: string;
    lastModified: Date;
    colorScheme: AnnotationColorScheme;
  };
}

// Re-export annotation utilities and constants for convenience
export * from './annotationConstants';
export * from './annotationUtils';
