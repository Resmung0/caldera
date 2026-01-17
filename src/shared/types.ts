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
}

export type ExtensionMessage =
    | { type: 'updatePipeline'; data: PipelineData; availablePipelines: string[] }
    | { type: 'setLoading'; isLoading: boolean }
    | { type: 'error'; message: string };

export type WebViewMessage =
    | { type: 'webviewReady' }
    | { type: 'selectPipeline'; filePath: string };

export enum PipelineType {
  CICD = 'cicd',
  DataProcessing = 'data-processing',
  AIAgent = 'ai-agent',
  RPA = 'rpa',
}
