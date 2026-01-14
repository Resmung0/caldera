import React, { useState, useEffect } from 'react';
import { PipelineCanvas } from './PipelineCanvas';
import { PipelineData, ExtensionMessage } from '../shared/types';

const App: React.FC = () => {
  const [pipelineData, setPipelineData] = useState<PipelineData>({
    framework: 'Waiting for data...',
    nodes: [],
    edges: []
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data;
      switch (message.type) {
        case 'updatePipeline':
          setPipelineData(message.data);
          break;
        case 'error':
          console.error(message.message);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return <PipelineCanvas data={pipelineData} />;
};

export default App;
