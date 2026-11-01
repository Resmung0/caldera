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
    if (
      node.id !== flowId ||
      node.data?.prefectType !== 'flow' ||
      getFlowTaskCount(node) === 0
    ) return node;

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
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const isFlowExpandedInVisiblePath = (
    flowId: string,
    visitedFlowIds = new Set<string>()
  ): boolean => {
    if (visitedFlowIds.has(flowId)) return false;
    const flowNode = nodesById.get(flowId);
    if (
      flowNode?.data?.prefectType !== 'flow' ||
      !flowNode.data.isFlowExpanded ||
      getFlowTaskCount(flowNode) === 0
    ) return false;

    const nextVisitedFlowIds = new Set(visitedFlowIds).add(flowId);
    const parentFlowIds = flowNode.data.prefectFlowIds ?? [];
    return parentFlowIds.length === 0 || parentFlowIds.some((parentFlowId) =>
      isFlowExpandedInVisiblePath(parentFlowId, nextVisitedFlowIds)
    );
  };
  const visibleNodes = nodes.filter((node) => {
    if (node.data?.prefectType === 'flow') {
      const parentFlowIds = node.data.prefectFlowIds ?? [];
      const isVisibleInParent = parentFlowIds.length === 0 ||
        parentFlowIds.some((parentFlowId) =>
          isFlowExpandedInVisiblePath(parentFlowId)
        );
      return isVisibleInParent && !isFlowExpandedInVisiblePath(node.id);
    }

    if (node.data?.prefectType === 'task') {
      const flowIds = node.data.prefectFlowIds ?? [];
      if (flowIds.length === 0) return true;
      return flowIds.some((flowId) => isFlowExpandedInVisiblePath(flowId));
    }

    return true;
  });
  const visibleNodeIds = new Set(visibleNodes.map(({ id }) => id));

  return {
    nodes: visibleNodes,
    edges: edges.filter((edge) =>
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    ),
  };
}

function getFlowTaskCount(node: GraphNode): number {
  return node.data?.prefectTaskCount ??
    node.data?.prefectTaskIds?.length ??
    0;
}

export function getExpandedPrefectFlowAnnotations(
  nodes: GraphNode[]
): PipelineAnnotation[] {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  return nodes.flatMap((node) => {
    if (node.data?.prefectType !== 'flow' || !node.data.isFlowExpanded) return [];

    const groupedNodeIds = new Set<string>();
    const addDescendants = (flowId: string, visitedFlowIds = new Set<string>()) => {
      if (visitedFlowIds.has(flowId)) return;
      const nextVisitedFlowIds = new Set(visitedFlowIds).add(flowId);
      const flow = nodesById.get(flowId);
      if (!flow) return;

      for (const taskId of flow.data?.prefectTaskIds ?? []) {
        groupedNodeIds.add(taskId);
      }
      for (const childFlowId of flow.data?.prefectChildFlowIds ?? []) {
        groupedNodeIds.add(childFlowId);
        addDescendants(childFlowId, nextVisitedFlowIds);
      }
    };
    addDescendants(node.id);
    const visibleGroupIds = Array.from(groupedNodeIds).filter((id) => nodesById.has(id));
    if (visibleGroupIds.length === 0) return [];

    const now = new Date(0);
    return [{
      id: `prefect-flow:${node.id}`,
      nodeIds: visibleGroupIds,
      patternType: PipelinePatternType.DATA_PROCESSING,
      patternSubtype: 'flow',
      color: '#f20d63',
      label: node.data.label ?? node.id,
      createdAt: now,
      modifiedAt: now,
      source: 'prefect-flow',
      flowId: node.id,
    }];
  });
}
