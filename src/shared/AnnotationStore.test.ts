import { AnnotationStore } from './AnnotationStore';
import { PipelinePatternType } from './types';

describe('AnnotationStore', () => {
  let store: AnnotationStore;

  beforeEach(() => {
    store = new AnnotationStore();
  });

  describe('Annotation CRUD Operations', () => {
    test('should create annotation with valid data', () => {
      const nodeIds = ['node1', 'node2'];
      const patternType = PipelinePatternType.CICD;
      const patternSubtype = 'testing';
      const label = 'Test Annotation';

      const annotationId = store.createAnnotation(nodeIds, patternType, patternSubtype, label);

      expect(annotationId).toBeDefined();
      const annotation = store.getAnnotation(annotationId);
      expect(annotation).toBeDefined();
      expect(annotation!.nodeIds).toEqual(nodeIds);
      expect(annotation!.patternType).toBe(patternType);
      expect(annotation!.patternSubtype).toBe(patternSubtype);
      expect(annotation!.label).toBe(label);
      expect(annotation!.color).toBeDefined();
    });

    test('should throw error when creating annotation with empty nodes', () => {
      expect(() => {
        store.createAnnotation([], PipelinePatternType.CICD, 'testing');
      }).toThrow('Cannot create annotation with empty node selection');
    });

    test('should update existing annotation', () => {
      const annotationId = store.createAnnotation(['node1'], PipelinePatternType.CICD, 'testing');
      const newLabel = 'Updated Label';

      const success = store.updateAnnotation(annotationId, { label: newLabel });

      expect(success).toBe(true);
      const annotation = store.getAnnotation(annotationId);
      expect(annotation!.label).toBe(newLabel);
      expect(annotation!.modifiedAt).toBeInstanceOf(Date);
    });

    test('should return false when updating non-existent annotation', () => {
      const success = store.updateAnnotation('non-existent', { label: 'test' });
      expect(success).toBe(false);
    });

    test('should delete annotation', () => {
      const annotationId = store.createAnnotation(['node1'], PipelinePatternType.CICD, 'testing');

      const success = store.deleteAnnotation(annotationId);

      expect(success).toBe(true);
      expect(store.getAnnotation(annotationId)).toBeUndefined();
    });

    test('should return false when deleting non-existent annotation', () => {
      const success = store.deleteAnnotation('non-existent');
      expect(success).toBe(false);
    });

    test('should add nodes to existing annotation', () => {
      const annotationId = store.createAnnotation(['node1'], PipelinePatternType.CICD, 'testing');

      const success = store.addNodesToAnnotation(annotationId, ['node2', 'node3']);

      expect(success).toBe(true);
      const annotation = store.getAnnotation(annotationId);
      expect(annotation!.nodeIds).toEqual(['node1', 'node2', 'node3']);
    });

    test('should remove nodes from annotation', () => {
      const annotationId = store.createAnnotation(['node1', 'node2', 'node3'], PipelinePatternType.CICD, 'testing');

      const success = store.removeNodesFromAnnotation(annotationId, ['node2']);

      expect(success).toBe(true);
      const annotation = store.getAnnotation(annotationId);
      expect(annotation!.nodeIds).toEqual(['node1', 'node3']);
    });

    test('should delete annotation when all nodes are removed', () => {
      const annotationId = store.createAnnotation(['node1'], PipelinePatternType.CICD, 'testing');

      const success = store.removeNodesFromAnnotation(annotationId, ['node1']);

      expect(success).toBe(true);
      expect(store.getAnnotation(annotationId)).toBeUndefined();
    });
  });

  describe('Selection State Management', () => {
    test('should set selection mode', () => {
      store.setSelectionMode(true);

      const state = store.getState();
      expect(state.selectionState.isSelectionMode).toBe(true);
    });

    test('should clear selection when disabling selection mode', () => {
      store.selectNodes(['node1', 'node2']);
      store.setSelectionMode(false);

      const state = store.getState();
      expect(state.selectionState.isSelectionMode).toBe(false);
      expect(state.selectionState.selectedNodeIds).toEqual([]);
    });

    test('should select nodes', () => {
      const nodeIds = ['node1', 'node2'];
      store.selectNodes(nodeIds);

      const state = store.getState();
      expect(state.selectionState.selectedNodeIds).toEqual(nodeIds);
    });

    test('should add node to selection', () => {
      store.selectNodes(['node1']);
      store.addNodeToSelection('node2');

      const state = store.getState();
      expect(state.selectionState.selectedNodeIds).toEqual(['node1', 'node2']);
    });

    test('should not add duplicate node to selection', () => {
      store.selectNodes(['node1']);
      store.addNodeToSelection('node1');

      const state = store.getState();
      expect(state.selectionState.selectedNodeIds).toEqual(['node1']);
    });

    test('should remove node from selection', () => {
      store.selectNodes(['node1', 'node2']);
      store.removeNodeFromSelection('node1');

      const state = store.getState();
      expect(state.selectionState.selectedNodeIds).toEqual(['node2']);
    });

    test('should clear selection', () => {
      store.selectNodes(['node1', 'node2']);
      store.clearSelection();

      const state = store.getState();
      expect(state.selectionState.selectedNodeIds).toEqual([]);
      expect(state.selectionState.pendingAnnotation).toBeUndefined();
    });
  });

  describe('UI State Management', () => {
    test('should set annotation mode', () => {
      store.setAnnotationMode(true);

      const state = store.getState();
      expect(state.uiState.isAnnotationMode).toBe(true);
    });

    test('should set active annotation', () => {
      const annotationId = 'test-annotation';
      store.setActiveAnnotation(annotationId);

      const state = store.getState();
      expect(state.uiState.activeAnnotationId).toBe(annotationId);
    });

    test('should set hovered annotation', () => {
      const annotationId = 'test-annotation';
      store.setHoveredAnnotation(annotationId);

      const state = store.getState();
      expect(state.uiState.hoveredAnnotationId).toBe(annotationId);
    });
  });

  describe('Persistence', () => {
    test('should serialize and load annotations', () => {
      const annotationId = store.createAnnotation(['node1'], PipelinePatternType.CICD, 'testing', 'Test');
      
      const serialized = store.serializeAnnotations();
      const newStore = new AnnotationStore();
      const success = newStore.loadAnnotations(serialized);

      expect(success).toBe(true);
      const loadedAnnotation = newStore.getAnnotation(annotationId);
      expect(loadedAnnotation).toBeDefined();
      expect(loadedAnnotation!.label).toBe('Test');
    });

    test('should handle invalid serialized data', () => {
      const success = store.loadAnnotations('invalid json');
      expect(success).toBe(false);
    });

    test('should clear all annotations', () => {
      store.createAnnotation(['node1'], PipelinePatternType.CICD, 'testing');
      store.setAnnotationMode(true);
      store.selectNodes(['node1']);

      store.clearAllAnnotations();

      const state = store.getState();
      expect(state.annotations.size).toBe(0);
      expect(state.uiState.isAnnotationMode).toBe(false);
      expect(state.selectionState.selectedNodeIds).toEqual([]);
    });
  });

  describe('Utility Methods', () => {
    test('should get annotations for node', () => {
      const annotation1Id = store.createAnnotation(['node1', 'node2'], PipelinePatternType.CICD, 'testing');
      const annotation2Id = store.createAnnotation(['node2', 'node3'], PipelinePatternType.DATA_PROCESSING, 'etlElt');

      const annotationsForNode2 = store.getAnnotationsForNode('node2');

      expect(annotationsForNode2).toHaveLength(2);
      expect(annotationsForNode2.map(a => a.id)).toContain(annotation1Id);
      expect(annotationsForNode2.map(a => a.id)).toContain(annotation2Id);
    });

    test('should check if nodes are annotated', () => {
      store.createAnnotation(['node1'], PipelinePatternType.CICD, 'testing');

      expect(store.areNodesAnnotated(['node1'])).toBe(true);
      expect(store.areNodesAnnotated(['node2'])).toBe(false);
      expect(store.areNodesAnnotated(['node1', 'node2'])).toBe(true);
    });

    test('should update preferences', () => {
      store.updatePreferences({ showLabels: false, animationEnabled: false });

      const state = store.getState();
      expect(state.preferences.showLabels).toBe(false);
      expect(state.preferences.animationEnabled).toBe(false);
    });
  });

  describe('State Subscription', () => {
    test('should notify listeners on state changes', () => {
      const listener = jest.fn();
      const unsubscribe = store.subscribe(listener);

      store.createAnnotation(['node1'], PipelinePatternType.CICD, 'testing');

      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });

    test('should not notify unsubscribed listeners', () => {
      const listener = jest.fn();
      const unsubscribe = store.subscribe(listener);
      unsubscribe();

      store.createAnnotation(['node1'], PipelinePatternType.CICD, 'testing');

      expect(listener).not.toHaveBeenCalled();
    });
  });
});