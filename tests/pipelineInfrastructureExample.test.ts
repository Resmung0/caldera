/**
 * Example Property-Based Tests for Pipeline Runner
 * 
 * This file demonstrates how to use the property-based testing infrastructure
 * with practical examples that can serve as templates for future tests.
 * 
 * Feature: pipeline-runner-refactoring
 */

import * as fc from 'fast-check';
import {
  arbLinearPipeline,
  arbDiamondPipeline,
  arbDAG,
  arbPipeline,
  allNodesHaveStatus,
  allEdgesHaveStatus,
  getRootNodes,
  isTopologicalOrder,
  createMockNotify,
  createMockSetters,
  createFCParams,
  PipelineGraph
} from './pipelineTestUtils';

describe('Pipeline Infrastructure - Example Property Tests', () => {
  describe('Example 1: Graph Structure Properties', () => {
    // Feature: pipeline-runner-refactoring, Example Property: Linear pipeline structure
    // For any linear pipeline, each node (except the last) should have exactly one outgoing edge
    test('linear pipelines have sequential structure', () => {
      fc.assert(
        fc.property(arbLinearPipeline(2, 8), (graph) => {
          // Every node except the last should have exactly one outgoing edge
          for (let i = 0; i < graph.nodes.length - 1; i++) {
            const nodeId = graph.nodes[i].id;
            const outgoingEdges = graph.edges.filter(e => e.source === nodeId);
            expect(outgoingEdges.length).toBe(1);
          }
          
          // The last node should have no outgoing edges
          const lastNodeId = graph.nodes[graph.nodes.length - 1].id;
          const lastNodeOutgoing = graph.edges.filter(e => e.source === lastNodeId);
          expect(lastNodeOutgoing.length).toBe(0);
        }),
        createFCParams()
      );
    });

    // Feature: pipeline-runner-refactoring, Example Property: DAG has root nodes
    // For any DAG, there must be at least one root node (node with no incoming edges)
    test('all DAGs have at least one root node', () => {
      fc.assert(
        fc.property(arbDAG(3, 10), (graph) => {
          const roots = getRootNodes(graph.nodes, graph.edges);
          expect(roots.length).toBeGreaterThanOrEqual(1);
        }),
        createFCParams()
      );
    });

    // Feature: pipeline-runner-refactoring, Example Property: No self-loops in DAG
    // For any DAG, no edge should connect a node to itself
    test('DAGs have no self-loops', () => {
      fc.assert(
        fc.property(arbDAG(3, 10), (graph) => {
          graph.edges.forEach(edge => {
            expect(edge.source).not.toBe(edge.target);
          });
        }),
        createFCParams()
      );
    });

    // Feature: pipeline-runner-refactoring, Example Property: All edges reference existing nodes
    // For any pipeline, all edges should reference nodes that exist in the graph
    test('all edges reference existing nodes', () => {
      fc.assert(
        fc.property(arbPipeline(), (graph) => {
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

  describe('Example 2: Status Management Properties', () => {
    // Feature: pipeline-runner-refactoring, Example Property: Status initialization
    // For any pipeline, when all nodes are set to idle, the helper should confirm this
    test('status helpers correctly identify uniform status', () => {
      fc.assert(
        fc.property(arbPipeline(), (graph) => {
          // Set all nodes to idle
          const nodesWithIdle = graph.nodes.map(n => ({
            ...n,
            data: { ...n.data, status: 'idle' as const }
          }));
          
          // Set all edges to idle
          const edgesWithIdle = graph.edges.map(e => ({
            ...e,
            data: { ...e.data, status: 'idle' as const }
          }));
          
          // Verify helpers work correctly
          if (nodesWithIdle.length > 0) {
            expect(allNodesHaveStatus(nodesWithIdle, 'idle')).toBe(true);
            expect(allNodesHaveStatus(nodesWithIdle, 'success')).toBe(false);
          }
          
          if (edgesWithIdle.length > 0) {
            expect(allEdgesHaveStatus(edgesWithIdle, 'idle')).toBe(true);
            expect(allEdgesHaveStatus(edgesWithIdle, 'processing')).toBe(false);
          }
        }),
        createFCParams()
      );
    });
  });

  describe('Example 3: Topological Ordering Properties', () => {
    // Feature: pipeline-runner-refactoring, Example Property: Linear order is topological
    // For any linear pipeline, the node order is a valid topological order
    test('linear pipeline node order is topologically valid', () => {
      fc.assert(
        fc.property(arbLinearPipeline(2, 8), (graph) => {
          const executionPlan = graph.nodes.map(n => n.id);
          expect(isTopologicalOrder(executionPlan, graph.edges)).toBe(true);
        }),
        createFCParams()
      );
    });

    // Feature: pipeline-runner-refactoring, Example Property: Reversed order is invalid
    // For any linear pipeline with 2+ nodes, the reversed order is NOT topologically valid
    test('reversed linear pipeline order is invalid', () => {
      fc.assert(
        fc.property(arbLinearPipeline(2, 8), (graph) => {
          const reversedPlan = [...graph.nodes].reverse().map(n => n.id);
          
          // Reversed order should be invalid (unless it's a single node)
          if (graph.nodes.length > 1) {
            expect(isTopologicalOrder(reversedPlan, graph.edges)).toBe(false);
          }
        }),
        createFCParams()
      );
    });
  });

  describe('Example 4: Mock Utilities Properties', () => {
    // Feature: pipeline-runner-refactoring, Example Property: Mock setters track updates
    // For any pipeline, mock setters should correctly track state updates
    test('mock setters correctly track node updates', () => {
      fc.assert(
        fc.property(arbPipeline(), (graph) => {
          const { setNodes, getNodes, resetNodes } = createMockSetters();
          
          // Initialize with graph nodes
          resetNodes(graph.nodes);
          expect(getNodes()).toEqual(graph.nodes);
          
          // Update using setter function
          setNodes(nodes => nodes.map(n => ({
            ...n,
            data: { ...n.data, status: 'success' as const }
          })));
          
          // Verify update was tracked
          const updatedNodes = getNodes();
          if (updatedNodes.length > 0) {
            expect(updatedNodes.every(n => n.data.status === 'success')).toBe(true);
          }
        }),
        createFCParams()
      );
    });

    // Feature: pipeline-runner-refactoring, Example Property: Mock notify tracks calls
    // For any sequence of notifications, the mock should track all calls correctly
    test('mock notify correctly tracks notification calls', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom('info', 'error', 'warning'),
              message: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (notifications) => {
            const mockNotify = createMockNotify();
            
            // Call notify for each notification
            notifications.forEach(({ type, message }) => {
              mockNotify(type as any, message);
            });
            
            // Verify all calls were tracked
            expect(mockNotify).toHaveBeenCalledTimes(notifications.length);
            
            // Verify each type was tracked correctly
            const infoCalls = notifications.filter(n => n.type === 'info').length;
            const errorCalls = notifications.filter(n => n.type === 'error').length;
            const warningCalls = notifications.filter(n => n.type === 'warning').length;
            
            expect(mockNotify.mock.calls.filter(c => c[0] === 'info').length).toBe(infoCalls);
            expect(mockNotify.mock.calls.filter(c => c[0] === 'error').length).toBe(errorCalls);
            expect(mockNotify.mock.calls.filter(c => c[0] === 'warning').length).toBe(warningCalls);
          }
        ),
        createFCParams()
      );
    });
  });

  describe('Example 5: Edge Case Properties', () => {
    // Feature: pipeline-runner-refactoring, Example Property: Empty pipeline handling
    // For empty pipelines, all helper functions should handle gracefully
    test('helpers handle empty pipelines gracefully', () => {
      const emptyGraph: PipelineGraph = { nodes: [], edges: [] };
      
      expect(allNodesHaveStatus(emptyGraph.nodes, 'idle')).toBe(true);
      expect(allEdgesHaveStatus(emptyGraph.edges, 'idle')).toBe(true);
      expect(getRootNodes(emptyGraph.nodes, emptyGraph.edges)).toEqual([]);
      expect(isTopologicalOrder([], emptyGraph.edges)).toBe(true);
    });

    // Feature: pipeline-runner-refactoring, Example Property: Diamond pattern structure
    // For any diamond pipeline, there should be exactly one start and one end node
    test('diamond pipelines have correct structure', () => {
      fc.assert(
        fc.property(arbDiamondPipeline(), (graph) => {
          expect(graph.nodes.length).toBe(4);
          expect(graph.edges.length).toBe(4);
          
          // Should have exactly one root node
          const roots = getRootNodes(graph.nodes, graph.edges);
          expect(roots.length).toBe(1);
          
          // Should have exactly one node with no outgoing edges (end node)
          const endNodes = graph.nodes.filter(n => {
            const outgoing = graph.edges.filter(e => e.source === n.id);
            return outgoing.length === 0;
          });
          expect(endNodes.length).toBe(1);
        }),
        createFCParams()
      );
    });
  });
});
