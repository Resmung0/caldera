export enum PipelinePatternType {
  CICD = 'cicd',
  DATA_PROCESSING = 'data-processing',
  AI_AGENT = 'ai-agent',
  RPA = 'rpa'
}

export interface AnnotationColorScheme {
  [PipelinePatternType.CICD]: {
    testing: string;
    build: string;
  };
  [PipelinePatternType.DATA_PROCESSING]: {
    modelInference: string;
    modelTraining: string;
    etl: string;
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
