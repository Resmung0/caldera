import { AnnotationColorScheme, PipelinePatternType } from './types';

// Definir o enum primeiro para evitar problemas de hoisting
export const PipelinePatternTypeEnum = {
  CICD: 'cicd' as const,
  DATA_PROCESSING: 'data-processing' as const,
  AI_AGENT: 'ai-agent' as const,
  RPA: 'rpa' as const
};

/**
 * Default color scheme for pipeline pattern annotations
 * Colors are chosen to be distinct and accessible in both light and dark themes
 */
export const DEFAULT_ANNOTATION_COLOR_SCHEME: AnnotationColorScheme = {
  [PipelinePatternTypeEnum.CICD]: {
    testing: '#10B981', // Emerald-500 - Green for testing
    build: '#3B82F6',   // Blue-500 - Blue for build
  },
  [PipelinePatternTypeEnum.DATA_PROCESSING]: {
    modelInference: '#8B5CF6',  // Violet-500 - Purple for model inference
    modelTraining: '#F59E0B',   // Amber-500 - Orange for model training
    etlElt: '#06B6D4',          // Cyan-500 - Cyan for ETL/ELT
    webscraping: '#84CC16',     // Lime-500 - Lime for webscraping
  },
  [PipelinePatternTypeEnum.AI_AGENT]: {
    promptChaining: '#EC4899',      // Pink-500 - Pink for prompt chaining
    routing: '#6366F1',             // Indigo-500 - Indigo for routing
    parallelization: '#14B8A6',     // Teal-500 - Teal for parallelization
    orchestratorWorkers: '#F97316', // Orange-500 - Orange for orchestrator workers
    evaluatorOptimizer: '#A855F7',  // Purple-500 - Purple for evaluator optimizer
  },
  [PipelinePatternTypeEnum.RPA]: {
    browseAutomation: '#EF4444', // Red-500 - Red for browse automation
  },
};

/**
 * Pattern subtype definitions for each pipeline pattern category
 */
export const PIPELINE_PATTERN_SUBTYPES = {
  [PipelinePatternTypeEnum.CICD]: [
    { key: 'testing', label: 'Testing', description: 'Test execution and validation steps' },
    { key: 'build', label: 'Build', description: 'Compilation and artifact creation steps' },
  ],
  [PipelinePatternTypeEnum.DATA_PROCESSING]: [
    { key: 'modelInference', label: 'Model Inference', description: 'Machine learning model prediction steps' },
    { key: 'modelTraining', label: 'Model Training', description: 'Machine learning model training steps' },
    { key: 'etlElt', label: 'ETL/ELT', description: 'Extract, Transform, Load data processing steps' },
    { key: 'webscraping', label: 'Web Scraping', description: 'Web data extraction and scraping steps' },
  ],
  [PipelinePatternTypeEnum.AI_AGENT]: [
    { key: 'promptChaining', label: 'Prompt Chaining', description: 'Sequential prompt execution steps' },
    { key: 'routing', label: 'Routing', description: 'Decision-based flow routing steps' },
    { key: 'parallelization', label: 'Parallelization', description: 'Parallel execution coordination steps' },
    { key: 'orchestratorWorkers', label: 'Orchestrator Workers', description: 'Worker coordination and management steps' },
    { key: 'evaluatorOptimizer', label: 'Evaluator Optimizer', description: 'Performance evaluation and optimization steps' },
  ],
  [PipelinePatternTypeEnum.RPA]: [
    { key: 'browseAutomation', label: 'Browse Automation', description: 'Web browser automation steps' },
  ],
} as const;

/**
 * Default annotation preferences
 */
export const DEFAULT_ANNOTATION_PREFERENCES = {
  colorScheme: DEFAULT_ANNOTATION_COLOR_SCHEME,
  showLabels: true,
  animationEnabled: true,
};

/**
 * Annotation system version for compatibility tracking
 */
export const ANNOTATION_SYSTEM_VERSION = '1.0.0';

/**
 * Default padding for annotation boundaries
 */
export const DEFAULT_ANNOTATION_PADDING = 12;