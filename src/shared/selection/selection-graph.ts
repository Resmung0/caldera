export function getConnectedNodeIds(
  selectedNodeIds: string[],
  edges: Array<{ source: string; target: string }>
): Set<string> {
  const selected = new Set(selectedNodeIds);
  const connected = new Set<string>();

  for (const edge of edges) {
    if (selected.has(edge.source) && !selected.has(edge.target)) {
      connected.add(edge.target);
    }
    if (selected.has(edge.target) && !selected.has(edge.source)) {
      connected.add(edge.source);
    }
  }

  return connected;
}
