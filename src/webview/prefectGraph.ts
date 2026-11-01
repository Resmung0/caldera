import { PipelineAnnotation, PipelinePatternType } from '../shared/types';

interface GraphNode {
  id: string;
  data?: {
    label?: string;
    prefectType?: string;
    prefectFlowIds?: string[];
    prefectChildFlowIds?: string[];
    prefectTaskIds?: string[];
    prefectTaskCount?: number;
    isFlowExpanded?: boolean;
    [key: string]: unknown;
  };
}

interface GraphEdge {
  source: string;
  target: string;
}

export function toggleFlowNode<TNode extends GraphNode>(
  nodes: TNode[],
  flowId: string
): TNode[] {
  return nodes.map((node) => {
    if (node.id !== flowId || node.data?.prefectType !== 'flow') return node;

    return {
      ...node,
      data: { ...node.data, isFlowExpanded: !node.data.isFlowExpanded },
    };
  });
}

export function getVisiblePrefectGraph<TNode extends GraphNode, TEdge extends GraphEdge>(
  nodes: TNode[],
  edges: TEdge[]
): { nodes: TNode[]; edges: TEdge[] } {
  const expandedFlowIds = new Set(
    nodes
      .filter((node) => node.data?.prefectType === 'flow' && node.data.isFlowExpanded)
      .map(({ id }) => id)
  );
  const visibleNodes = nodes.filter((node) => {
    const flowIds = node.data.prefectFlowIds ?? [];
    return flowIds.length === 0 || flowIds.some((flowId) => expandedFlowIds.has(flowId));
  });
  const visibleNodeIds = new Set(visibleNodes.map(({ id }) => id));

  return {
    nodes: visibleNodes,
    edges: edges.filter((edge) =>
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    ),
  };
}

export function getExpandedPrefectFlowAnnotations(
  nodes: GraphNode[]
): PipelineAnnotation[] {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  return nodes.flatMap((node) => {
    if (node.data?.prefectType !== 'flow' || !node.data.isFlowExpanded) return [];

    const groupedNodeIds = new Set<string>([node.id]);
    const addDescendants = (flowId: string, visited = new Set<string>()) => {
      if (visited.has(flowId)) return;
      const nextVisited = new Set(visited).add(flowId);
      const flow = nodesById.get(flowId);
      if (!flow) return;

      for (const taskId of flow.data?.prefectTaskIds ?? []) {
        groupedNodeIds.add(taskId);
      }
      for (const childFlowId of flow.data?.prefectChildFlowIds ?? []) {
        groupedNodeIds.add(childFlowId);
        addDescendants(childFlowId, nextVisited);
      }
    };
    addDescendants(node.id);
    if (groupedNodeIds.size === 1) return [];

    const now = new Date(0);
    return [{
      id: `prefect-flow:${node.id}`,
      nodeIds: Array.from(groupedNodeIds),
      patternType: PipelinePatternType.DATA_PROCESSING,
      patternSubtype: 'flow',
      color: '#f20d63',
      label: `Flow: ${node.data.label ?? node.id}`,
      createdAt: now,
      modifiedAt: now,
      source: 'prefect-flow',
    }];
  });
}
