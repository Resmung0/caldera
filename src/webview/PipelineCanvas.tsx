import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
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
  Settings,
  Database,
  BrainCircuit,
  Bot,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  GitBranch,
  Terminal
} from 'lucide-react';

const nodeWidth = 220;
const nodeHeight = 80;

// --- Components ---

const TopPanel = () => {
  const [activeContext, setActiveContext] = useState<string>('cicd');

  const contexts = [
    { id: 'cicd', icon: Settings, label: 'CI/CD' },
    { id: 'data', icon: Database, label: 'Data' },
    { id: 'ai', icon: BrainCircuit, label: 'AI Orchestration' },
    { id: 'rpa', icon: Bot, label: 'RPA' },
  ];

  const activeIndex = contexts.findIndex(c => c.id === activeContext);
  const BUTTON_WIDTH = 40;
  const GAP = 12;

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
            <Icon size={20} />
          </button>
        );
      })}
      <style>{`
        .top-panel {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 12px;
          padding: 8px 16px;
          background: rgba(30, 32, 49, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 100;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .active-indicator {
          position: absolute;
          left: 16px;
          top: 8px;
          width: 40px;
          height: 40px;
          background: #f20d63;
          border-radius: 8px;
          z-index: 0;
          transition: transform 0.4s cubic-bezier(0.2, 0, 0.2, 1);
          box-shadow: 0 0 15px rgba(242, 13, 99, 0.4);
        }
        .context-btn {
          width: 40px;
          height: 40px;
          padding: 0;
          background: transparent;
          border: none;
          color: #888;
          border-radius: 8px;
          cursor: pointer;
          transition: color 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
        }
        .context-btn:hover:not(.active) {
          color: white;
          background: rgba(255, 255, 255, 0.1);
        }
        .context-btn.active {
          color: white;
        }
      `}</style>
    </div>
  );
};

const PipelineNodeItem = ({ data }: NodeProps) => {
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
      <Handle type="target" position={Position.Top} className="handle" />

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

      <Handle type="source" position={Position.Bottom} className="handle" />

      <style>{`
        .pipeline-node-item {
          background: #1e2031;
          color: white;
          border: 1px solid rgba(137, 31, 255, 0.3);
          border-radius: 12px;
          padding: 12px;
          width: 200px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
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
          border: 2px solid #1e2031 !important;
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
      targetPosition: direction === 'LR' ? 'left' : 'top',
      sourcePosition: direction === 'LR' ? 'right' : 'bottom',
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// --- Main Canvas ---

interface PipelineCanvasProps {
  data: PipelineData;
}

export const PipelineCanvas: React.FC<PipelineCanvasProps> = ({ data }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const nodeTypes = useMemo(() => ({ custom: PipelineNodeItem }), []);

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
        width: 20,
        height: 20,
      },
    }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [data, setNodes, setEdges]);

  // Handle empty state
  if (data.nodes.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        background: '#181B28',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
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
    <div style={{ width: '100%', height: '100vh', background: '#181B28' }}>
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
        <Background color="#2a2d3e" gap={20} size={1} />
        <Controls style={{ background: '#1e2031', border: 'none', fill: 'white' }} />
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
