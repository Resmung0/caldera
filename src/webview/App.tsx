import React, { useState, useEffect } from 'react';
import { PipelineCanvas } from './PipelineCanvas';
import { LoadingScreen } from './LoadingScreen';
import { PipelineData, ExtensionMessage } from '../shared/types';

// Acquire the VS Code API (must be done only once)
const vscode = (window as any).acquireVsCodeApi ? (window as any).acquireVsCodeApi() : {
  postMessage: (msg: any) => console.log('Mock postMessage:', msg)
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [pipelineData, setPipelineData] = useState<PipelineData>({
    framework: 'Waiting for data...',
    nodes: [],
    edges: []
  });

  useEffect(() => {
    console.log('[Pipeline Visualizer Webview] 🎬 App initialized, listening for messages...');

    // Notify extension that we are ready to receive data (Handshake)
    console.log('[Pipeline Visualizer Webview] 📤 Sending webviewReady signal...');
    vscode.postMessage({ type: 'webviewReady' });

    const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data;
      console.log('[Pipeline Visualizer Webview] 📨 Message received:', message);

      switch (message.type) {
        case 'updatePipeline':
          console.log('[Pipeline Visualizer Webview] 📊 Updating pipeline data:', message.data);
          setPipelineData(message.data);
          break;
        case 'setLoading':
          console.log('[Pipeline Visualizer Webview] ⏳ Setting loading:', message.isLoading);
          setIsLoading(message.isLoading);
          break;
        case 'error':
          console.error('[Pipeline Visualizer Webview] ❌ Error:', message.message);
          break;
        default:
          console.log('[Pipeline Visualizer Webview] ⚠️ Unknown message type:', message.type);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <PipelineCanvas data={pipelineData} />;
};

export default App;
