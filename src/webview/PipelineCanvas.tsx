import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toPng } from 'html-to-image';
import ReactFlow, {
  Panel,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  ControlButton,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  MarkerType,
  Handle,
  Position,
  NodeProps
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { PipelineData } from '../shared/types';
import {
  Database,
  Sparkle,
  Workflow,
  Bot,
  CheckCircle,
  XCircle,
  Clock,
  GitBranch,
  Terminal,
  Camera,
  ArrowRightLeft,
  ArrowUpDown
} from 'lucide-react';

const nodeWidth = 220;
const nodeHeight = 80;

// --- Components ---

const TopPanel = () => {
  const [activeContext, setActiveContext] = useState<string>('cicd');

  const contexts = [
    { id: 'cicd', icon: Workflow, label: 'CI/CD' },
    { id: 'data', icon: Database, label: 'Data Processing' },
    { id: 'ai', icon: Sparkle, label: 'AI Orchestration' },
    { id: 'rpa', icon: Bot, label: 'RPA' },
  ];

  const activeIndex = contexts.findIndex(c => c.id === activeContext);
  const BUTTON_WIDTH = 32;
  const GAP = 8;

  return (
    <div className="top-panel">
      <div
        className="active-indicator"
        style={{
          transform: `translateX(${activeIndex * (BUTTON_WIDTH + GAP)}px)`
        }}
      />

      {contexts.map((ctx) => {
        const Icon = ctx.icon;
        const isActive = activeContext === ctx.id;
        return (
          <button
            key={ctx.id}
            className={`context-btn ${isActive ? 'active' : ''}`}
            onClick={() => setActiveContext(ctx.id)}
            title={ctx.label}
          >
            <Icon size={16} />
          </button>
        );
      })}
      <style>{`
        .top-panel {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(30, 32, 49, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 10px;
          border: 1px solid var(--color-border);
          z-index: 100;
          box-shadow: 0 4px 6px var(--color-shadow);
        }
        .active-indicator {
          position: absolute;
          left: 12px;
          top: 6px;
          width: 32px;
          height: 32px;
          background: #f20d63;
          border-radius: 6px;
          z-index: 0;
          transition: transform 0.4s cubic-bezier(0.2, 0, 0.2, 1);
          box-shadow: 0 0 15px rgba(242, 13, 99, 0.4);
        }
        .context-btn {
          width: 32px;
          height: 32px;
          padding: 0;
          background: transparent;
          border: none;
          color: #888;
          border-radius: 6px;
          cursor: pointer;
          transition: color 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
        }
        .context-btn:hover:not(.active) {
          color: var(--color-text-primary);
          background: var(--color-border);
        }
        .context-btn.active {
          color: var(--color-text-primary);
        }
      `}</style>
    </div>
  );
};

const PipelineNodeItem = ({ data }: NodeProps) => {
  const { layoutDirection = 'TB' } = data;

  const targetPosition = layoutDirection === 'LR' ? Position.Left : Position.Top;
  const sourcePosition = layoutDirection === 'LR' ? Position.Right : Position.Bottom;
  // Determine icon based on status or type if available
  const getStatusIcon = () => {
    switch (data.status) {
      case 'success': return <CheckCircle size={16} color="#4ade80" />;
      case 'failed': return <XCircle size={16} color="#ef4444" />;
      case 'running': return <Clock size={16} color="#3b82f6" />;
      default: return <Terminal size={16} color="#a0aec0" />;
    }
  };

  return (
    <div className="pipeline-node-item">
      <Handle type="target" position={targetPosition} className="handle" />

      <div className="node-header">
        <div className="node-icon">
          {getStatusIcon()}
        </div>
        <div className="node-title">{data.label}</div>
      </div>

      <div className="node-body">
        {data.framework && (
          <div className="node-meta">
            <GitBranch size={12} style={{ marginRight: 4 }} />
            <span>{data.framework}</span>
          </div>
        )}
        <div className="node-status">
          {data.status || 'Idle'}
        </div>
      </div>

      <Handle type="source" position={sourcePosition} className="handle" />

      <style>{`
        .pipeline-node-item {
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 12px;
          width: 200px;
          box-shadow: 0 4px 6px var(--color-shadow);
          transition: all 0.3s ease;
        }
        .pipeline-node-item:hover {
          border-color: #f20d63;
          box-shadow: 0 0 15px rgba(242, 13, 99, 0.3);
          transform: translateY(-2px);
        }
        .node-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 8px;
        }
        .node-title {
          font-weight: 600;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .node-body {
          font-size: 11px;
          color: #a0aec0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .node-meta {
          display: flex;
          align-items: center;
        }
        .handle {
          background: #f20d63 !important;
          width: 8px !important;
          height: 8px !important;
          border: 2px solid var(--color-bg-primary) !important;
        }
      `}</style>
    </div>
  );
};

// --- Layout Logic ---

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// --- Main Canvas ---

const PipelineSelectorPanel = ({ availablePipelines, currentPipeline, onPipelineSelect }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);
  
  if (!availablePipelines || availablePipelines.length <= 1) {
    return null;
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentFileName = currentPipeline ? currentPipeline.split('/').pop() : '';

  return (
    <Panel position="bottom-right" style={{ marginBottom: '90px', marginRight: '10px' }}>
      <div className="pipeline-selector" ref={dropdownRef}>
        <GitBranch size={14} />
        <div className="custom-select" onClick={() => setIsOpen(!isOpen)}>
          <span className="selected-value">{currentFileName}</span>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {isOpen && (
          <div className="dropdown-options">
            {availablePipelines.map((p) => (
              <div
                key={p}
                className={`dropdown-option ${p === currentPipeline ? 'selected' : ''}`}
                onClick={() => {
                  onPipelineSelect(p);
                  setIsOpen(false);
                }}
              >
                {p.split('/').pop()}
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        .pipeline-selector {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--color-bg-primary);
          border-radius: 8px;
          border: 1px solid var(--color-border);
          box-shadow: 0 2px 8px var(--color-shadow);
          color: var(--color-text-primary);
          min-width: 160px;
          position: relative;
        }
        .custom-select {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex: 1;
          cursor: pointer;
          gap: 8px;
        }
        .selected-value {
          font-size: 13px;
          font-weight: 400;
          color: var(--color-text-primary);
          flex: 1;
          text-align: left;
        }
        .dropdown-arrow {
          color: var(--color-text-primary);
          opacity: 0.6;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .dropdown-arrow.open {
          transform: rotate(180deg);
          opacity: 1;
        }
        .dropdown-options {
          position: absolute;
          bottom: 100%;
          left: 0;
          right: 0;
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          box-shadow: 0 4px 12px var(--color-shadow);
          margin-bottom: 4px;
          z-index: 1000;
          max-height: 200px;
          overflow-y: auto;
        }
        .dropdown-option {
          padding: 8px 12px;
          font-size: 13px;
          color: var(--color-text-primary);
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .dropdown-option:hover {
          background: var(--color-bg-hover);
        }
        .dropdown-option.selected {
          background: #f20d63;
          color: white;
        }
        .dropdown-option:first-child {
          border-top-left-radius: 7px;
          border-top-right-radius: 7px;
        }
        .dropdown-option:last-child {
          border-bottom-left-radius: 7px;
          border-bottom-right-radius: 7px;
        }
        .pipeline-selector:hover {
          border-color: #f20d63;
          box-shadow: 0 0 12px rgba(242, 13, 99, 0.25);
        }
        .pipeline-selector:hover .dropdown-arrow {
          opacity: 1;
        }
      `}</style>
    </Panel>
  );
};

interface PipelineCanvasProps {
  data: PipelineData;
  availablePipelines: string[];
  onPipelineSelect: (filePath: string) => void;
}

export const PipelineCanvas: React.FC<PipelineCanvasProps> = ({ data, availablePipelines, onPipelineSelect }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');

  const toggleLayoutDirection = useCallback(() => {
    setLayoutDirection((prevDirection) => (prevDirection === 'TB' ? 'LR' : 'TB'));
  }, []);

  const nodeTypes = useMemo(
    () => ({
      custom: (props) => (
        <PipelineNodeItem {...props} data={{ ...props.data, layoutDirection }} />
      ),
    }),
    [layoutDirection]
  );

  const handleExportPNG = () => {
    const reactFlowElement = document.querySelector('.react-flow');
    if (reactFlowElement) {
      const computedStyle = getComputedStyle(reactFlowElement);
      const backgroundColor = computedStyle.backgroundColor;
      toPng(reactFlowElement as HTMLElement, {
        backgroundColor: backgroundColor || '#181B28',
        width: reactFlowElement.scrollWidth,
        height: reactFlowElement.scrollHeight,
      }).then((dataUrl) => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'pipeline.png';
        a.click();
      });
    }
  };

  const nodeColor = useCallback(() => '#f20d63', []);

  useEffect(() => {
    const initialNodes = data.nodes.map(n => ({
      id: n.id,
      type: 'custom', // Use our custom node
      data: {
        label: n.label,
        status: n.status,
        framework: data.framework // Pass framework to node
      },
      position: { x: 0, y: 0 },
    }));

    const initialEdges = data.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: true,
      style: { stroke: '#474c60', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#474c60',
        width: 12,
        height: 12,
      },
    }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      layoutDirection
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [data, setNodes, setEdges, layoutDirection]);

  // Handle empty state
  if (data.nodes.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        background: 'var(--color-bg-tertiary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-primary)'
      }}>
        <TopPanel />
        <div style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }}>📊</div>
        <div style={{ marginTop: '0.5rem', color: '#666' }}>
          Waiting for pipeline data...
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh', background: 'var(--color-bg-tertiary)' }}>
      <TopPanel />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={(_, node) => {
          setEdges((eds) => eds.map(e => {
            if (e.source === node.id || e.target === node.id) {
              const currentMarker = typeof e.markerEnd === 'object' ? e.markerEnd : { type: MarkerType.ArrowClosed };
              return {
                ...e,
                style: { stroke: '#f20d63', strokeWidth: 3, filter: 'drop-shadow(0 0 4px #f20d63)' },
                animated: true,
                markerEnd: { ...currentMarker, color: '#f20d63' }
              };
            }
            return e;
          }));
        }}
        onNodeMouseLeave={() => {
          setEdges((eds) => eds.map(e => {
            const currentMarker = typeof e.markerEnd === 'object' ? e.markerEnd : { type: MarkerType.ArrowClosed };
            return {
              ...e,
              style: { stroke: '#474c60', strokeWidth: 2 },
              animated: true,
              markerEnd: { ...currentMarker, color: '#474c60' }
            };
          }));
        }}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
      >
        <Background color="var(--color-bg-secondary)" gap={20} size={1} />
        <Controls>
          <ControlButton onClick={toggleLayoutDirection} title="Toggle Orientation">
            {layoutDirection === 'TB' ? <ArrowRightLeft size={16} /> : <ArrowUpDown size={16} />}
          </ControlButton>
          <ControlButton onClick={handleExportPNG} title="Export as PNG">
            <Camera size={16} />
          </ControlButton>
        </Controls>
        <MiniMap 
          pannable 
          zoomable 
          nodeStrokeWidth={3}
          nodeColor={nodeColor}
          maskColor="rgba(24, 27, 40, 0.6)"
          style={{ width: 100, height: 70 }}
        />
        <PipelineSelectorPanel
          availablePipelines={availablePipelines}
          onPipelineSelect={onPipelineSelect}
          currentPipeline={data.filePath}
        />
      </ReactFlow>

      <style>{`
        .react-flow__edge.active .react-flow__edge-path {
          stroke: #f20d63 !important;
          stroke-width: 3;
        }
      `}</style>
    </div>
  );
};
