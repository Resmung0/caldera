/**
 * Tests for Pipeline Test Utilities
 * 
 * This file verifies that the property-based testing infrastructure
 * is set up correctly and all generators work as expected.
 * 
 * Feature: pipeline-runner-refactoring
 */

import * as fc from 'fast-check';
import {
  arbStatus,
  arbNodeLabel,
  arbNodeParams,
  arbCodeDeps,
  arbNodeData,
  arbNode,
  arbEdgeData,
  arbEdge,
  arbLinearPipeline,
  arbBranchingPipeline,
  arbDiamondPipeline,
  arbDAG,
  arbEmptyPipeline,
  arbSingleNodePipeline,
  arbDisconnectedPipeline,
  arbPipeline,
  hasNodeStatus,
  allNodesHaveStatus,
  hasEdgeStatus,
  allEdgesHaveStatus,
  getIncomingEdges,
  getOutgoingEdges,
  getRootNodes,
  wasNotificationCalled,
  countNotifications,
  isTopologicalOrder,
  arraysEqual,
  createMockNotify,
  createMockSetters,
  createFCParams,
  PBT_CONFIG
} from './pipelineTestUtils';

describe('Pipeline Test Utilities - Infrastructure Verification', () => {
  describe('Basic Generators', () => {
    test('arbStatus generates valid pipeline statuses', () => {
      fc.assert(
        fc.property(arbStatus(), (status) => {
          expect(['idle', 'processing', 'success', 'failed']).toContain(status);
        }),
        createFCParams()
      );
    });

    test('arbNodeLabel generates non-empty strings', () => {
      fc.assert(
        fc.property(arbNodeLabel(), (label) => {
          expect(typeof label).toBe('string');
          expect(label.length).toBeGreaterThan(0);
        }),
        createFCParams()
      );
    });

    test('arbNodeParams generates valid parameter objects', () => {
      fc.assert(
        fc.property(arbNodeParams(), (params) => {
          expect(typeof params).toBe('object');
          expect(params).not.toBeNull();
          expect(Object.keys(params).length).toBeLessThanOrEqual(5);
        }),
        createFCParams()
      );
    });

    test('arbCodeDeps generates valid dependency arrays', () => {
      fc.assert(
        fc.property(arbCodeDeps(), (deps) => {
          expect(Array.isArray(deps)).toBe(true);
          expect(deps.length).toBeLessThanOrEqual(5);
          deps.forEach(dep => {
            expect(dep).toHaveProperty('path');
            expect(typeof dep.path).toBe('string');
          });
        }),
        createFCParams()
      );
    });

    test('arbNodeData generates valid node data objects', () => {
      fc.assert(
        fc.property(arbNodeData(), (data) => {
          expect(data).toHaveProperty('label');
          expect(typeof data.label).toBe('string');
          
          if (data.status) {
            expect(['idle', 'processing', 'success', 'failed']).toContain(data.status);
          }
          
          if (data.params) {
            expect(typeof data.params).toBe('object');
          }
          
          if (data.codeDeps) {
            expect(Array.isArray(data.codeDeps)).toBe(true);
          }
        }),
        createFCParams()
      );
    });

    test('arbNode generates valid node objects', () => {
      fc.assert(
        fc.property(arbNode('test-id'), (node) => {
          expect(node.id).toBe('test-id');
          expect(node).toHaveProperty('position');
          expect(node).toHaveProperty('data');
          expect(node.data).toHaveProperty('label');
        }),
        createFCParams()
      );
    });

    test('arbEdgeData generates valid edge data objects', () => {
      fc.assert(
        fc.property(arbEdgeData(), (data) => {
          expect(typeof data).toBe('object');
          
          if (data.status) {
            expect(['idle', 'processing', 'success', 'failed']).toContain(data.status);
          }
        }),
        createFCParams()
      );
    });

    test('arbEdge generates valid edge objects', () => {
      fc.assert(
        fc.property(arbEdge('source-id', 'target-id'), (edge) => {
          expect(edge.id).toBe('source-id-target-id');
          expect(edge.source).toBe('source-id');
          expect(edge.target).toBe('target-id');
          expect(edge).toHaveProperty('data');
        }),
        createFCParams()
      );
    });
  });

  describe('Pipeline Graph Generators', () => {
    test('arbLinearPipeline generates valid linear pipelines', () => {
      fc.assert(
        fc.property(arbLinearPipeline(2, 5), (graph) => {
          expect(graph.nodes.length).toBeGreaterThanOrEqual(2);
          expect(graph.nodes.length).toBeLessThanOrEqual(5);
          expect(graph.edges.length).toBe(graph.nodes.length - 1);
          
          // Verify linear structure: each node (except last) has exactly one outgoing edge
          for (let i = 0; i < graph.nodes.length - 1; i++) {
            const outgoing = getOutgoingEdges(graph.edges, graph.nodes[i].id);
            expect(outgoing.length).toBe(1);
          }
        }),
        createFCParams()
      );
    });

    test('arbBranchingPipeline generates valid branching pipelines', () => {
      fc.assert(
        fc.property(arbBranchingPipeline(), (graph) => {
          expect(graph.nodes.length).toBeGreaterThanOrEqual(2);
          
          // Should have at least one root node
          const roots = getRootNodes(graph.nodes, graph.edges);
          expect(roots.length).toBeGreaterThanOrEqual(1);
        }),
        createFCParams()
      );
    });

    test('arbDiamondPipeline generates valid diamond pipelines', () => {
      fc.assert(
        fc.property(arbDiamondPipeline(), (graph) => {
          expect(graph.nodes.length).toBe(4);
          expect(graph.edges.length).toBe(4);
          
          // Verify diamond structure
          const roots = getRootNodes(graph.nodes, graph.edges);
          expect(roots.length).toBe(1);
        }),
        createFCParams()
      );
    });

    test('arbDAG generates valid directed acyclic graphs', () => {
      fc.assert(
        fc.property(arbDAG(3, 8), (graph) => {
          expect(graph.nodes.length).toBeGreaterThanOrEqual(3);
          expect(graph.nodes.length).toBeLessThanOrEqual(8);
          
          // Should have at least one root node
          const roots = getRootNodes(graph.nodes, graph.edges);
          expect(roots.length).toBeGreaterThanOrEqual(1);
          
          // Verify no self-loops
          graph.edges.forEach(edge => {
            expect(edge.source).not.toBe(edge.target);
          });
        }),
        createFCParams()
      );
    });

    test('arbEmptyPipeline generates empty pipelines', () => {
      fc.assert(
        fc.property(arbEmptyPipeline(), (graph) => {
          expect(graph.nodes.length).toBe(0);
          expect(graph.edges.length).toBe(0);
        }),
        createFCParams()
      );
    });

    test('arbSingleNodePipeline generates single-node pipelines', () => {
      fc.assert(
        fc.property(arbSingleNodePipeline(), (graph) => {
          expect(graph.nodes.length).toBe(1);
          expect(graph.edges.length).toBe(0);
        }),
        createFCParams()
      );
    });

    test('arbDisconnectedPipeline generates disconnected pipelines', () => {
      fc.assert(
        fc.property(arbDisconnectedPipeline(), (graph) => {
          expect(graph.nodes.length).toBeGreaterThanOrEqual(4);
          
          // Should have multiple root nodes (disconnected components)
          const roots = getRootNodes(graph.nodes, graph.edges);
          expect(roots.length).toBeGreaterThanOrEqual(2);
        }),
        createFCParams()
      );
    });

    test('arbPipeline generates various valid pipeline structures', () => {
      fc.assert(
        fc.property(arbPipeline(), (graph) => {
          // Basic validity checks
          expect(Array.isArray(graph.nodes)).toBe(true);
          expect(Array.isArray(graph.edges)).toBe(true);
          
          // All edges should reference existing nodes
          const nodeIds = new Set(graph.nodes.map(n => n.id));
          graph.edges.forEach(edge => {
            expect(nodeIds.has(edge.source)).toBe(true);
            expect(nodeIds.has(edge.target)).toBe(true);
          });
        }),
        createFCParams()
      );
    });
  });

  describe('Helper Functions', () => {
    test('hasNodeStatus correctly identifies node status', () => {
      const nodes = [
        { id: 'n1', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node 1', status: 'success' as const } },
        { id: 'n2', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node 2', status: 'failed' as const } }
      ];
      
      expect(hasNodeStatus(nodes, 'n1', 'success')).toBe(true);
      expect(hasNodeStatus(nodes, 'n1', 'failed')).toBe(false);
      expect(hasNodeStatus(nodes, 'n2', 'failed')).toBe(true);
    });

    test('allNodesHaveStatus correctly checks all nodes', () => {
      const nodes = [
        { id: 'n1', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node 1', status: 'idle' as const } },
        { id: 'n2', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node 2', status: 'idle' as const } }
      ];
      
      expect(allNodesHaveStatus(nodes, 'idle')).toBe(true);
      expect(allNodesHaveStatus(nodes, 'success')).toBe(false);
    });

    test('hasEdgeStatus correctly identifies edge status', () => {
      const edges = [
        { id: 'e1', source: 'n1', target: 'n2', data: { status: 'processing' as const } },
        { id: 'e2', source: 'n2', target: 'n3', data: { status: 'success' as const } }
      ];
      
      expect(hasEdgeStatus(edges, 'e1', 'processing')).toBe(true);
      expect(hasEdgeStatus(edges, 'e1', 'success')).toBe(false);
      expect(hasEdgeStatus(edges, 'e2', 'success')).toBe(true);
    });

    test('allEdgesHaveStatus correctly checks all edges', () => {
      const edges = [
        { id: 'e1', source: 'n1', target: 'n2', data: { status: 'idle' as const } },
        { id: 'e2', source: 'n2', target: 'n3', data: { status: 'idle' as const } }
      ];
      
      expect(allEdgesHaveStatus(edges, 'idle')).toBe(true);
      expect(allEdgesHaveStatus(edges, 'processing')).toBe(false);
    });

    test('getIncomingEdges returns correct edges', () => {
      const edges = [
        { id: 'e1', source: 'n1', target: 'n2', data: {} },
        { id: 'e2', source: 'n2', target: 'n3', data: {} },
        { id: 'e3', source: 'n1', target: 'n3', data: {} }
      ];
      
      const incoming = getIncomingEdges(edges, 'n3');
      expect(incoming.length).toBe(2);
      expect(incoming.map(e => e.id).sort()).toEqual(['e2', 'e3']);
    });

    test('getOutgoingEdges returns correct edges', () => {
      const edges = [
        { id: 'e1', source: 'n1', target: 'n2', data: {} },
        { id: 'e2', source: 'n1', target: 'n3', data: {} },
        { id: 'e3', source: 'n2', target: 'n3', data: {} }
      ];
      
      const outgoing = getOutgoingEdges(edges, 'n1');
      expect(outgoing.length).toBe(2);
      expect(outgoing.map(e => e.id).sort()).toEqual(['e1', 'e2']);
    });

    test('getRootNodes identifies nodes with no incoming edges', () => {
      const nodes = [
        { id: 'n1', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
        { id: 'n2', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node 2' } },
        { id: 'n3', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node 3' } }
      ];
      const edges = [
        { id: 'e1', source: 'n1', target: 'n2', data: {} },
        { id: 'e2', source: 'n2', target: 'n3', data: {} }
      ];
      
      const roots = getRootNodes(nodes, edges);
      expect(roots.length).toBe(1);
      expect(roots[0].id).toBe('n1');
    });

    test('wasNotificationCalled detects notification calls', () => {
      const mockNotify = createMockNotify();
      
      mockNotify('info', 'Pipeline started');
      mockNotify('error', 'Pipeline failed at node: Node1');
      
      expect(wasNotificationCalled(mockNotify, 'info')).toBe(true);
      expect(wasNotificationCalled(mockNotify, 'error')).toBe(true);
      expect(wasNotificationCalled(mockNotify, 'warning')).toBe(false);
      expect(wasNotificationCalled(mockNotify, 'error', 'Node1')).toBe(true);
      expect(wasNotificationCalled(mockNotify, 'error', /failed at node/)).toBe(true);
    });

    test('countNotifications counts correctly', () => {
      const mockNotify = createMockNotify();
      
      mockNotify('info', 'Message 1');
      mockNotify('info', 'Message 2');
      mockNotify('error', 'Error message');
      
      expect(countNotifications(mockNotify)).toBe(3);
      expect(countNotifications(mockNotify, 'info')).toBe(2);
      expect(countNotifications(mockNotify, 'error')).toBe(1);
      expect(countNotifications(mockNotify, 'warning')).toBe(0);
    });

    test('isTopologicalOrder validates execution order', () => {
      const edges = [
        { id: 'e1', source: 'n1', target: 'n2', data: {} },
        { id: 'e2', source: 'n2', target: 'n3', data: {} },
        { id: 'e3', source: 'n1', target: 'n3', data: {} }
      ];
      
      expect(isTopologicalOrder(['n1', 'n2', 'n3'], edges)).toBe(true);
      expect(isTopologicalOrder(['n2', 'n1', 'n3'], edges)).toBe(false);
      expect(isTopologicalOrder(['n1', 'n3', 'n2'], edges)).toBe(false);
    });

    test('arraysEqual compares arrays correctly', () => {
      expect(arraysEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(arraysEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(arraysEqual([1, 2], [1, 2, 3])).toBe(false);
      expect(arraysEqual([], [])).toBe(true);
    });

    test('createMockSetters creates functional mock setters', () => {
      const { setNodes, setEdges, getNodes, getEdges, resetNodes, resetEdges } = createMockSetters();
      
      const testNodes = [
        { id: 'n1', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node 1' } }
      ];
      const testEdges = [
        { id: 'e1', source: 'n1', target: 'n2', data: {} }
      ];
      
      resetNodes(testNodes);
      resetEdges(testEdges);
      
      expect(getNodes()).toEqual(testNodes);
      expect(getEdges()).toEqual(testEdges);
      
      // Test updater function
      setNodes(nodes => nodes.map(n => ({ ...n, data: { ...n.data, status: 'success' as const } })));
      expect(getNodes()[0].data.status).toBe('success');
    });
  });

  describe('Configuration', () => {
    test('PBT_CONFIG has correct default values', () => {
      expect(PBT_CONFIG.numRuns).toBe(100);
      expect(PBT_CONFIG.timeout).toBe(30000);
      expect(typeof PBT_CONFIG.verbose).toBe('boolean');
    });

    test('createFCParams creates valid fast-check parameters', () => {
      const params = createFCParams();
      expect(params.numRuns).toBe(100);
      
      const customParams = createFCParams({ numRuns: 200 });
      expect(customParams.numRuns).toBe(200);
    });
  });
});
