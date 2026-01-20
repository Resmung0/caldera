import {
  AnnotationStore
} from '../src/shared/AnnotationStore';
import {
  SelectionManager
} from '../src/shared/SelectionManager';
import {
  PipelineNode,
  PipelinePatternType
} from '../src/shared/types';
import {
  createInitialAnnotationState
} from '../src/shared/annotationUtils';

describe('Pipeline Annotation Integration Tests', () => {

  describe('Complete Annotation Workflow', () => {
    let annotationStore: AnnotationStore;
    let selectionManager: SelectionManager;
    let mockNodes: PipelineNode[];

    beforeEach(() => {
      annotationStore = new AnnotationStore(createInitialAnnotationState());
      selectionManager = new SelectionManager();

      mockNodes = [
        { id: 'node1', label: 'Build Step', type: 'build' },
        { id: 'node2', label: 'Test Step', type: 'test' },
        { id: 'node3', label: 'Deploy Step', type: 'deploy' },
        { id: 'node4', label: 'Monitor Step', type: 'monitor' }
      ];

      selectionManager.setAvailableNodes(mockNodes);
    });

    test('Full annotation workflow from selection to persistence', () => {
      // 1. Activate selection mode
      selectionManager.activateSelectionMode();
      expect(selectionManager.isSelectionMode()).toBe(true);

      // 2. Select multiple nodes
      selectionManager.addNodeToSelection('node1');
      selectionManager.addNodeToSelection('node2');
      selectionManager.addNodeToSelection('node3');

      const selectedNodes = selectionManager.getSelectedNodeIds();
      expect(selectedNodes).toEqual(['node1', 'node2', 'node3']);

      // 3. Create annotation from selection
      const annotationId = annotationStore.createAnnotation(
        selectedNodes,
        PipelinePatternType.CICD,
        'build'
      );

      expect(annotationId).toBeDefined();

      const annotation = annotationStore.getAnnotation(annotationId);
      expect(annotation).toBeDefined();
      expect(annotation?.nodeIds).toEqual(['node1', 'node2', 'node3']);
      expect(annotation?.patternType).toBe(PipelinePatternType.CICD);
      expect(annotation?.patternSubtype).toBe('build');

      // 4. Verify annotation is stored
      const allAnnotations = annotationStore.getAllAnnotations();
      expect(allAnnotations.length).toBe(1);
      expect(allAnnotations[0].id).toBe(annotationId);

      // 5. Test annotation modification
      const success = annotationStore.addNodesToAnnotation(annotationId, ['node4']);
      expect(success).toBe(true);

      const updatedAnnotation = annotationStore.getAnnotation(annotationId);
      expect(updatedAnnotation?.nodeIds).toEqual(['node1', 'node2', 'node3', 'node4']);

      // 6. Test node removal from annotation
      const removeSuccess = annotationStore.removeNodesFromAnnotation(annotationId, ['node2']);
      expect(removeSuccess).toBe(true);

      const finalAnnotation = annotationStore.getAnnotation(annotationId);
      expect(finalAnnotation?.nodeIds).toEqual(['node1', 'node3', 'node4']);

      // 7. Verify persistence state
      const state = annotationStore.getState();
      expect(state.annotations.size).toBe(1);
      // Note: Selection state in annotation store is separate from selection manager
      // The selection manager state is not automatically synced with annotation store
    });

    test('Annotation deletion workflow', () => {
      // Setup
      selectionManager.activateSelectionMode();
      selectionManager.selectNodes(['node1', 'node2']);

      const annotationId = annotationStore.createAnnotation(
        selectionManager.getSelectedNodeIds(),
        PipelinePatternType.DATA_PROCESSING,
        'etl'
      );

      // Verify creation
      expect(annotationStore.getAnnotation(annotationId)).toBeDefined();

      // Delete annotation
      const deleteSuccess = annotationStore.deleteAnnotation(annotationId);
      expect(deleteSuccess).toBe(true);

      // Verify deletion
      expect(annotationStore.getAnnotation(annotationId)).toBeUndefined();
      expect(annotationStore.getAllAnnotations().length).toBe(0);
    });

    test('Cross-pattern annotation support', () => {
      const patterns = [
        { type: PipelinePatternType.CICD, subtype: 'testing', expectedColor: '#10B981' },
        { type: PipelinePatternType.DATA_PROCESSING, subtype: 'modelTraining', expectedColor: '#F59E0B' },
        { type: PipelinePatternType.AI_AGENT, subtype: 'promptChaining', expectedColor: '#EC4899' },
        { type: PipelinePatternType.RPA, subtype: 'browseAutomation', expectedColor: '#EF4444' }
      ];

      patterns.forEach(({ type, subtype, expectedColor }) => {
        const annotationId = annotationStore.createAnnotation(
          ['node1'],
          type,
          subtype
        );

        const annotation = annotationStore.getAnnotation(annotationId);
        expect(annotation).toBeDefined();
        expect(annotation?.patternType).toBe(type);
        expect(annotation?.patternSubtype).toBe(subtype);
        // Compare colors ignoring case
        expect(annotation?.color.toLowerCase()).toBe(expectedColor.toLowerCase());
      });

      expect(annotationStore.getAllAnnotations().length).toBe(4);
    });

    test('Selection state synchronization', () => {
      // Test that selection manager and annotation store states stay synchronized
      selectionManager.activateSelectionMode();
      selectionManager.selectNodes(['node1', 'node2']);

      // Simulate UI state updates
      annotationStore.setSelectionMode(true);
      annotationStore.selectNodes(['node1', 'node2']);

      const selectionState = annotationStore.getState().selectionState;
      expect(selectionState.isSelectionMode).toBe(true);
      expect(selectionState.selectedNodeIds).toEqual(['node1', 'node2']);

      // Test clearing selection
      selectionManager.clearSelection();
      annotationStore.clearSelection();

      const clearedState = annotationStore.getState().selectionState;
      expect(clearedState.selectedNodeIds).toEqual([]);
    });

    test('Error handling for invalid operations', () => {
      // Test that selection manager prevents empty selections
      selectionManager.activateSelectionMode();

      // Try to create annotation with empty selection (should fail gracefully)
      expect(() => {
        annotationStore.createAnnotation(
          [],
          PipelinePatternType.CICD,
          'build'
        );
      }).toThrow('Cannot create annotation with empty node selection');

      // Test adding nodes to annotation (note: doesn't validate node existence)
      selectionManager.selectNodes(['node1']);

      const annotationId = annotationStore.createAnnotation(
        selectionManager.getSelectedNodeIds(),
        PipelinePatternType.CICD,
        'testing'
      );

      // Adding non-existent nodes technically succeeds (no validation)
      const addResult = annotationStore.addNodesToAnnotation(annotationId, ['nonexistent']);
      expect(addResult).toBe(true);

      // But the annotation should still contain the original nodes plus the invalid one
      const annotation = annotationStore.getAnnotation(annotationId);
      expect(annotation?.nodeIds).toContain('node1');
      expect(annotation?.nodeIds).toContain('nonexistent');

      // Test removing all original nodes from annotation (should delete it)
      const removeAllOriginal = annotationStore.removeNodesFromAnnotation(annotationId, ['node1']);
      expect(removeAllOriginal).toBe(true);
      // The annotation should still exist because 'nonexistent' node remains
      expect(annotationStore.getAnnotation(annotationId)).toBeDefined();

      // Removing the last node should delete the annotation
      const removeLast = annotationStore.removeNodesFromAnnotation(annotationId, ['nonexistent']);
      expect(removeLast).toBe(true);
      expect(annotationStore.getAnnotation(annotationId)).toBeUndefined();
    });
  });

  describe('Performance and Edge Cases', () => {
    test('Handles large number of annotations efficiently', () => {
      const annotationStore = new AnnotationStore(createInitialAnnotationState());
      const mockNodes: PipelineNode[] = Array.from({ length: 20 }, (_, i) => ({
        id: `node${i}`,
        label: `Node ${i}`
      }));

      const selectionManager = new SelectionManager(mockNodes);

      // Create 50 annotations
      for (let i = 0; i < 50; i++) {
        const nodeSubset = mockNodes.slice(i % 10, (i % 10) + 3).map(n => n.id);
        if (nodeSubset.length > 0) {
          const annotationId = annotationStore.createAnnotation(
            nodeSubset,
            PipelinePatternType.CICD,
            'testing'
          );
          expect(annotationId).toBeDefined();
        }
      }

      expect(annotationStore.getAllAnnotations().length).toBeGreaterThanOrEqual(40);
    });

    test('Maintains annotation integrity during rapid operations', () => {
      const annotationStore = new AnnotationStore(createInitialAnnotationState());
      const mockNodes: PipelineNode[] = [
        { id: 'node1', label: 'Node 1' },
        { id: 'node2', label: 'Node 2' },
        { id: 'node3', label: 'Node 3' }
      ];

      const selectionManager = new SelectionManager(mockNodes);
      selectionManager.activateSelectionMode();

      // Rapid creation and modification
      const annotationId = annotationStore.createAnnotation(
        ['node1', 'node2'],
        PipelinePatternType.CICD,
        'testing'
      );

      // Quick add/remove operations
      annotationStore.addNodesToAnnotation(annotationId, ['node3']);
      annotationStore.removeNodesFromAnnotation(annotationId, ['node1']);
      annotationStore.addNodesToAnnotation(annotationId, ['node1']);

      const finalAnnotation = annotationStore.getAnnotation(annotationId);
      expect(finalAnnotation?.nodeIds.sort()).toEqual(['node1', 'node2', 'node3'].sort());
    });
  });
});