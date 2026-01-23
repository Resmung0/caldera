import { PipelineNode } from '../types';

export function getNodesInArea(
  nodePositions: Map<string, { x: number; y: number }>,
  availableNodeIds: Set<string>,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): string[] {
  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  const minY = Math.min(startY, endY);
  const maxY = Math.max(startY, endY);

  const nodesInArea: string[] = [];

  for (const [nodeId, position] of nodePositions) {
    if (
      availableNodeIds.has(nodeId) &&
      position.x >= minX &&
      position.x <= maxX &&
      position.y >= minY &&
      position.y <= maxY
    ) {
      nodesInArea.push(nodeId);
    }
  }

  return nodesInArea;
}
