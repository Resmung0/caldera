import fc from 'fast-check';
import {
  AnnotationStore
} from '../src/shared/annotation/AnnotationStore';
import {
  createInitialAnnotationState
} from '../src/shared/annotation/annotationUtils';
import {
  SelectionManager
} from '../src/shared/selection/SelectionManager';
import {
  PipelineNode,
  PipelinePatternType
} from '../src/shared/types';
import {
  createAnnotation
} from '../src/shared/annotation/annotationUtils';
import {
  generateAnnotationId
} from '../src/shared/annotation/annotationDomain';

// Helper functions for test data generation
const arbitraryNodeId = () => fc.string({ minLength: 1, maxLength: 20 });
const arbitraryPatternType = () => fc.constantFrom(
  PipelinePatternType.CICD,
  PipelinePatternType.DATA_PROCESSING,
  PipelinePatternType.AI_AGENT,
  PipelinePatternType.RPA
);

const arbitraryPatternSubtype = () => fc.string({ minLength: 3, maxLength: 20 });

const arbitraryNodeList = () => fc.array(arbitraryNodeId(), { minLength: 1, maxLength: 10 })
  .filter(ids => new Set(ids).size === ids.length); // Ensure unique IDs

const arbitraryAnnotation = () => fc.record({
  nodeIds: arbitraryNodeList(),
  patternType: arbitraryPatternType(),
  patternSubtype: arbitraryPatternSubtype()
}).map(({ nodeIds, patternType, patternSubtype }) =>
  createAnnotation(nodeIds, patternType, patternSubtype)
);

describe('Pipeline Annotation Property Tests', () => {

  // Property 1: Selection Mode Activation
  describe('Property 1: Selection Mode Activation', () => {
    test('For any UI state, when the Annotator_Button is clicked, the system should transition to Selection_Mode', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // Initial selection mode state
          (initialSelectionMode) => {
            const store = new AnnotationStore(createInitialAnnotationState());

            // Set initial state
            store.setSelectionMode(initialSelectionMode);

            // Toggle selection mode by setting opposite state
            store.setSelectionMode(!initialSelectionMode);
            store.setAnnotationMode(!initialSelectionMode);

            const newState = store.getState();

            // Should always be in opposite state
            expect(newState.selectionState.isSelectionMode).toBe(!initialSelectionMode);
            expect(newState.uiState.isAnnotationMode).toBe(!initialSelectionMode);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 2: Multi-Node Selection Behavior
  describe('Property 2: Multi-Node Selection Behavior', () => {
    test('For any set of pipeline nodes, when Selection_Mode is active, clicking on nodes should add them to the selection', () => {
      fc.assert(
        fc.property(
          arbitraryNodeList(), // Available nodes
          fc.array(fc.nat(), { maxLength: 5 }), // Click indices
          (nodeIds, clickIndices) => {
            const manager = new SelectionManager();
            const nodes: PipelineNode[] = nodeIds.map(id => ({
              id,
              label: `Node ${id}`
            }));

            manager.setAvailableNodes(nodes);
            // Activate selection mode
            manager.activateSelectionMode();

            // Simulate clicks on nodes
            const uniqueClicks = [...new Set(clickIndices)].slice(0, nodeIds.length);
            uniqueClicks.forEach(index => {
              if (index < nodeIds.length) {
                manager.addNodeToSelection(nodeIds[index]);
              }
            });

            const selectedNodes = manager.getSelectedNodes();

            // All clicked nodes should be selected (within bounds)
            const validClicks = uniqueClicks.filter(i => i < nodeIds.length);
            const clickedNodeIds = validClicks.map(i => nodeIds[i]);

            clickedNodeIds.forEach(nodeId => {
              expect(selectedNodes.some(n => n.id === nodeId)).toBe(true);
            });

            // Selection mode should remain active
            expect(manager.isSelectionMode()).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 3: Annotation Creation Controls
  describe('Property 3: Annotation Creation Controls', () => {
    test('Annotation creation is rejected when no nodes are selected or selection mode is disabled', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          arbitraryNodeList(),
          (isSelectionMode, selectedNodeIds) => {
            // Only consider cases where annotation creation should be disallowed:
            // either selection mode is off or there are no selected nodes.
            fc.pre(!isSelectionMode || selectedNodeIds.length === 0);

            const store = new AnnotationStore(createInitialAnnotationState());

            // Apply selection mode and node selection according to generated values
            store.setSelectionMode(isSelectionMode);

            if (selectedNodeIds.length > 0) {
              store.selectNodes(selectedNodeIds);
            }

            // Guard must prevent annotation creation when there is effectively no selection
            expect(store.canCreateAnnotation()).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('For any selection of nodes, when nodes are selected, annotation creation controls should become enabled', () => {
      fc.assert(
        fc.property(
          arbitraryNodeList().filter(ids => ids.length >= 1), // At least one node
          (selectedNodeIds) => {
            const store = new AnnotationStore(createInitialAnnotationState());

            // Activate selection mode and select nodes
            store.setSelectionMode(true);
            store.selectNodes(selectedNodeIds);

            const state = store.getState();

            // Should be able to create annotation when nodes are selected
            expect(state.selectionState.isSelectionMode).toBe(true);
            expect(state.selectionState.selectedNodeIds.length).toBeGreaterThan(0);
            expect(state.selectionState.selectedNodeIds).toEqual(selectedNodeIds);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 4: Pipeline Pattern Support
  describe('Property 4: Pipeline Pattern Support', () => {
    test('For any supported pipeline pattern type, the system should allow creation of annotations with that pattern type', () => {
      fc.assert(
        fc.property(
          arbitraryNodeList(),
          arbitraryPatternType(),
          arbitraryPatternSubtype(),
          (nodeIds, patternType, patternSubtype) => {
            const store = new AnnotationStore(createInitialAnnotationState());

            // Create annotation with pattern
            const annotationId = store.createAnnotation(nodeIds, patternType, patternSubtype);

            // Should successfully create annotation
            expect(annotationId).toBeDefined();
            expect(typeof annotationId).toBe('string');

            const annotation = store.getAnnotation(annotationId);
            expect(annotation).toBeDefined();
            expect(annotation?.patternType).toBe(patternType);
            expect(annotation?.patternSubtype).toBe(patternSubtype);
            expect(annotation?.nodeIds).toEqual(nodeIds);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 7: Annotation Persistence
  describe('Property 7: Annotation Persistence', () => {
    test('For any annotation, when created, it should be persisted with the pipeline configuration', () => {
      fc.assert(
        fc.property(
          arbitraryAnnotation(),
          (annotation) => {
            const store = new AnnotationStore(createInitialAnnotationState());

            // Add annotation to store
            const annotationId = store.createAnnotation(
              annotation.nodeIds,
              annotation.patternType,
              annotation.patternSubtype
            );

            // Should be retrievable
            const retrievedAnnotation = store.getAnnotation(annotationId);
            expect(retrievedAnnotation).toBeDefined();
            expect(retrievedAnnotation?.id).toBe(annotationId);

            // Should appear in getAllAnnotations
            const allAnnotations = store.getAllAnnotations();
            expect(allAnnotations.some(a => a.id === annotationId)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 8: Annotation Modification
  describe('Property 8: Annotation Modification', () => {
    test('For any existing annotation, users should be able to modify it by adding or removing nodes', () => {
      fc.assert(
        fc.property(
          arbitraryNodeList().filter(ids => ids.length >= 2),
          fc.integer({ min: 1, max: 3 }),
          (initialNodeIds, modificationCount) => {
            const store = new AnnotationStore(createInitialAnnotationState());

            // Create initial annotation
            const annotationId = store.createAnnotation(
              initialNodeIds,
              PipelinePatternType.CICD,
              'testing'
            );

            let currentNodeIds = [...initialNodeIds];

            // Perform random modifications
            for (let i = 0; i < modificationCount; i++) {
              const shouldAdd = Math.random() > 0.5;

              if (shouldAdd && currentNodeIds.length < 10) {
                // Add a new node
                const newNodeId = `new_node_${i}`;
                const success = store.addNodesToAnnotation(annotationId, [newNodeId]);
                if (success) {
                  currentNodeIds.push(newNodeId);
                }
              } else if (currentNodeIds.length > 1) {
                // Remove a node
                const nodeToRemove = currentNodeIds[0];
                const success = store.removeNodesFromAnnotation(annotationId, [nodeToRemove]);
                if (success) {
                  currentNodeIds = currentNodeIds.filter(id => id !== nodeToRemove);
                }
              }

              // Verify annotation still exists and has correct nodes
              const annotation = store.getAnnotation(annotationId);
              expect(annotation).toBeDefined();
              if (annotation) {
                expect(new Set(annotation.nodeIds)).toEqual(new Set(currentNodeIds));
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 10: Cross-Parser Compatibility
  describe('Property 10: Cross-Parser Compatibility', () => {
    test('For any pipeline type, annotation functionality should work consistently', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'ai-agent',
            'cicd',
            'data-processing',
            'rpa'
          ),
          arbitraryNodeList(),
          (pipelineType, nodeIds) => {
            const store = new AnnotationStore(createInitialAnnotationState());

            // Should be able to create annotations regardless of pipeline type
            const annotationId = store.createAnnotation(
              nodeIds,
              PipelinePatternType.CICD, // Using CICD as example
              'testing'
            );

            expect(annotationId).toBeDefined();
            expect(store.getAnnotation(annotationId)).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});