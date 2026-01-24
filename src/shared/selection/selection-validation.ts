
export function validateSelectionState(
  selectedNodeIds: Set<string>,
  availableNodeIds: Set<string>,
  isSelectionModeActive: boolean,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (selectedNodeIds.size > 0 && !isSelectionModeActive) {
    errors.push('Nodes are selected but selection mode is not active');
  }

  for (const nodeId of selectedNodeIds) {
    if (!availableNodeIds.has(nodeId)) {
      errors.push(`Selected node '${nodeId}' is not available`);
    }
  }

  return { isValid: errors.length === 0, errors };
}
