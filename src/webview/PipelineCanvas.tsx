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

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = direction === 'LR' ? 'left' : 'top';
    node.sourcePosition = direction === 'LR' ? 'right' : 'bottom';

    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes, edges };
};

interface PipelineCanvasProps {
  data: PipelineData;
}

export const PipelineCanvas: React.FC<PipelineCanvasProps> = ({ data }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
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
        onNodeMouseEnter={(_ ,node) => {
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
