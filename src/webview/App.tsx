import React from 'react';
import { PipelineCanvas } from './PipelineCanvas';
import { LoadingScreen } from './LoadingScreen';
import { PipelineData, ExtensionMessage, WebViewMessage } from '../shared/types';

// Acquire the VS Code API (must be done only once)
const vscode = (window as any).acquireVsCodeApi ? (window as any).acquireVsCodeApi() : {
  postMessage: (msg: any) => console.log('Mock postMessage:', msg)
};

// --- State Management Hook ---

const useAppStore = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [availablePipelines, setAvailablePipelines] = React.useState<string[]>([]);
  const [pipelineData, setPipelineData] = React.useState<PipelineData>({
    filePath: '',
    framework: 'Waiting for data...',
    nodes: [],
    edges: []
  });

  const postMessage = (message: WebViewMessage) => {
    vscode.postMessage(message);
  };

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data;
      console.log('[WEBVIEW] 📨 Message received:', message);

      switch (message.type) {
        case 'updatePipeline':
          setPipelineData(message.data);
          setAvailablePipelines(message.availablePipelines);
          break;
        case 'setLoading':
          setIsLoading(message.isLoading);
          break;
        case 'error':
          console.error('[WEBVIEW] ❌ Error:', message.message);
          break;
        default:
          console.warn('[WEBVIEW] ⚠️ Unknown message type');
      }
    };

    window.addEventListener('message', handleMessage);

    console.log('[WEBVIEW] 📤 Sending webviewReady signal...');
    postMessage({ type: 'webviewReady' });

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handlePipelineSelect = (filePath: string) => {
    console.log(`[WEBVIEW] 📤 Requesting pipeline update for: ${filePath}`);
    postMessage({ type: 'selectPipeline', filePath });
  };

  const handleCategorySelect = (category: string) => {
    console.log(`[WEBVIEW] 📤 Requesting pipeline scan for category: ${category}`);
    postMessage({ type: 'selectCategory', category });
  };

  return {
    isLoading,
    pipelineData,
    availablePipelines,
    handlePipelineSelect,
    handleCategorySelect
  };
};


// --- Main Component ---

const App: React.FC = () => {
  const {
    isLoading,
    pipelineData,
    availablePipelines,
    handlePipelineSelect,
    handleCategorySelect
  } = useAppStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <PipelineCanvas
      data={pipelineData}
      availablePipelines={availablePipelines}
      onPipelineSelect={handlePipelineSelect}
      onCategorySelect={handleCategorySelect}
    />
  );
};

export default App;
