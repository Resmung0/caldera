import { useEffect, useState } from 'react';
import { AnnotationStore } from '../../shared/annotation/AnnotationStore';
import { PipelinePatternType, SelectionState } from '../../shared/types';
import { SelectionManager } from '../../shared/selection/SelectionManager';
import { getPatternColor } from '../../shared/annotation/annotationDomain';

export function useAnnotations(
  onNotify: (type: 'info' | 'error' | 'warning', message: string) => void,
  selectionManager: SelectionManager,
) {
  const [annotationStore] = useState(() => new AnnotationStore());
  const [annotations, setAnnotations] = useState(() => annotationStore.getAllAnnotations());
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [selectorPosition, setSelectorPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const unsubscribe = annotationStore.subscribe((annotationState) => {
      setAnnotations(Array.from(annotationState.annotations.values()));
    });
    return unsubscribe;
  }, [annotationStore]);

  const handlePatternSelect = (
    selectionState: SelectionState,
    patternType: PipelinePatternType,
    patternSubtype: string,
  ) => {
    if (editingAnnotationId) {
        const {
            preferences: { colorScheme },
        } = annotationStore.getState();

        const color = getPatternColor(patternType, patternSubtype, colorScheme);
      annotationStore.updateAnnotation(editingAnnotationId, {
        patternType,
        patternSubtype,
        color,
      });
      onNotify('info', `Updated annotation pattern to ${patternType}`);
      setEditingAnnotationId(null);
      selectionManager.deactivateSelectionMode();
      return;
    }

    if (selectionState.selectedNodeIds.length > 0) {
      try {
        const annotationId = annotationStore.createAnnotation(
          selectionState.selectedNodeIds,
          patternType,
          patternSubtype,
        );
        onNotify(
          'info',
          `Created ${patternType} annotation with ${selectionState.selectedNodeIds.length} nodes`,
        );
      } catch (e: any) {
        onNotify('error', e.message);
      } finally {
        selectionManager.deactivateSelectionMode();
      }
    }
  };

  const handleDeleteAnnotation = (id: string) => {
    if (annotationStore.deleteAnnotation(id)) {
      onNotify('info', 'Annotation deleted');
    }
  };

  const handleEditAnnotation = (id: string, position: { x: number; y: number }) => {
    const annotation = annotationStore.getAnnotation(id);
    if (annotation) {
      setEditingAnnotationId(id);
      setSelectorPosition(position);
      selectionManager.activateSelectionMode();
      selectionManager.selectNodes(annotation.nodeIds);
    }
  };

  return {
    annotations,
    editingAnnotationId,
    selectorPosition,
    setSelectorPosition,
    handlePatternSelect,
    handleDeleteAnnotation,
    handleEditAnnotation,
  };
}
