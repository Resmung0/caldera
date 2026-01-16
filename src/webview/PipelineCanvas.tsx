import React, { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  MarkerType
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { PipelineData } from '../shared/types';

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  console.log('[PipelineCanvas] 🎨 Laying out elements:', { nodeCount: nodes.length, edgeCount: edges.length });

  if (nodes.length === 0) {
    console.log('[PipelineCanvas] ⚠️ No nodes to layout');
    return { nodes: [], edges: [] };
  }

  // Create a fresh graph for each layout
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

  console.log('[PipelineCanvas] ✅ Layout complete:', layoutedNodes);
  return { nodes: layoutedNodes, edges };
};

interface PipelineCanvasProps {
  data: PipelineData;
}

export const PipelineCanvas: React.FC<PipelineCanvasProps> = ({ data }) => {
  console.log('[PipelineCanvas] 🎯 Rendering with data:', data);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    console.log('[PipelineCanvas] 📥 Data changed, updating nodes/edges:', {
      nodeCount: data.nodes.length,
      edgeCount: data.edges.length
    });

    const initialNodes = data.nodes.map(n => ({
      id: n.id,
      data: { label: n.label },
      position: { x: 0, y: 0 },
      className: 'pipeline-node',
    }));

    const initialEdges = data.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: true,
      style: { stroke: '#474c60' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#474c60',
      },
    }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [data, setNodes, setEdges]);

  // Show a message when there are no nodes
  if (data.nodes.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(to bottom, #181B28, #1e2031)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</div>
        <div style={{ fontSize: '1.2rem', color: '#888' }}>{data.framework}</div>
        <div style={{ marginTop: '0.5rem', color: '#666' }}>
          Open a pipeline file (.yml, .yaml, caldera.json) to visualize
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh', background: 'linear-gradient(to bottom, #181B28, #1e2031)' }}>
      <div className="header" style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 10,
        color: '#f20d63',
        fontWeight: 'bold',
        fontSize: '1.2rem'
      }}>
        {data.framework}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={(_, node) => {
          setEdges((eds) => eds.map(e => {
            if (e.source === node.id || e.target === node.id) {
              return { ...e, style: { stroke: '#f20d63', strokeWidth: 3 }, animated: true };
            }
            return e;
          }));
        }}
        onNodeMouseLeave={() => {
          setEdges((eds) => eds.map(e => ({ ...e, style: { stroke: '#474c60' }, animated: true })));
        }}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
      >
        <Background color="#333" gap={16} />
        <Controls />
      </ReactFlow>
      <style>{`
        .pipeline-node {
          background: #1e2031;
          color: white;
          border: 1px solid #891fff;
          border-radius: 8px;
          padding: 10px;
          font-size: 12px;
          box-shadow: 0 0 10px rgba(137, 31, 255, 0.3);
          transition: all 0.3s ease;
        }
        .pipeline-node:hover {
          box-shadow: 0 0 20px rgba(242, 13, 99, 0.6);
          border-color: #f20d63;
        }
        .react-flow__edge.active .react-flow__edge-path {
          stroke: #f20d63 !important;
          stroke-width: 3;
        }
      `}</style>
    </div>
  );
};
