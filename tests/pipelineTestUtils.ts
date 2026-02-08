/**
 * Property-Based Testing Utilities for Pipeline Runner Refactoring
 * 
 * This module provides generators and helper functions for testing the pipeline runner
 * using fast-check property-based testing library.
 * 
 * Feature: pipeline-runner-refactoring
 */

import * as fc from 'fast-check';
import React from 'react';
import { Node, Edge } from 'reactflow';
import { PipelineStatus } from '../src/webview/hooks/usePipelineRunner';

// ============================================================================
// Type Definitions
// ============================================================================

export interface TestNodeData {
  label: string;
  status?: PipelineStatus;
  framework?: string;
  params?: Record<string, any>;
  codeDeps?: Array<{ path: string }>;
  type?: string;
  dataType?: string;
  contents?: string[];
}

export interface TestEdgeData {
  status?: PipelineStatus;
}

export interface PipelineGraph {
  nodes: Node<TestNodeData>[];
  edges: Edge<TestEdgeData>[];
}

// ============================================================================
// Generators for Random Data
// ============================================================================

/**
 * Generates a random pipeline status value
 */
export const arbStatus = (): fc.Arbitrary<PipelineStatus> => {
  return fc.constantFrom('idle', 'processing', 'success', 'failed');
};

/**
 * Generates a random node label
 */
export const arbNodeLabel = (): fc.Arbitrary<string> => {
  return fc.oneof(
    fc.constant('Load Data'),
    fc.constant('Transform'),
    fc.constant('Train Model'),
    fc.constant('Evaluate'),
    fc.constant('Deploy'),
    fc.constant('Preprocess'),
    fc.constant('Feature Engineering'),
    fc.constant('Validate'),
    fc.string({ minLength: 1, maxLength: 20 })
  );
};

/**
 * Generates random node parameters
 */
export const arbNodeParams = (): fc.Arbitrary<Record<string, any>> => {
  return fc.dictionary(
    fc.string({ minLength: 1, maxLength: 10 }),
    fc.oneof(
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.double(),
      fc.constant(null)
    ),
    { minKeys: 0, maxKeys: 5 }
  );
};

/**
 * Generates random code dependencies
 */
export const arbCodeDeps = (): fc.Arbitrary<Array<{ path: string }>> => {
  return fc.array(
    fc.record({
      path: fc.oneof(
        fc.constant('src/data/loader.py'),
        fc.constant('src/models/train.py'),
        fc.constant('src/utils/helpers.py'),
        fc.constant('config/settings.yaml'),
        fc.string({ minLength: 5, maxLength: 30 })
      )
    }),
    { minLength: 0, maxLength: 5 }
  );
};

/**
 * Generates random node data
 */
export const arbNodeData = (): fc.Arbitrary<TestNodeData> => {
  return fc.record({
    label: arbNodeLabel(),
    status: fc.option(arbStatus(), { nil: undefined }),
    framework: fc.option(fc.constantFrom('pytorch', 'tensorflow', 'sklearn'), { nil: undefined }),
    params: fc.option(arbNodeParams(), { nil: undefined }),
    codeDeps: fc.option(arbCodeDeps(), { nil: undefined }),
    type: fc.option(fc.constantFrom('stage', 'artifact', 'metric'), { nil: undefined }),
    dataType: fc.option(fc.constantFrom('model', 'dataset', 'metrics'), { nil: undefined }),
    contents: fc.option(fc.array(fc.string(), { maxLength: 3 }), { nil: undefined })
  });
};

/**
 * Generates a single node with a given ID
 */
export const arbNode = (id: string): fc.Arbitrary<Node<TestNodeData>> => {
  return arbNodeData().map(data => ({
    id,
    type: 'custom',
    position: { x: 0, y: 0 },
    data
  }));
};

/**
 * Generates random edge data
 */
export const arbEdgeData = (): fc.Arbitrary<TestEdgeData> => {
  return fc.record({
    status: fc.option(arbStatus(), { nil: undefined })
  });
};

/**
 * Generates a single edge between two nodes
 */
export const arbEdge = (source: string, target: string): fc.Arbitrary<Edge<TestEdgeData>> => {
  return arbEdgeData().map(data => ({
    id: `${source}-${target}`,
    source,
    target,
    data
  }));
};

// ============================================================================
// DAG (Directed Acyclic Graph) Generators
// ============================================================================

/**
 * Generates a linear pipeline (chain of nodes)
 * Example: A -> B -> C -> D
 */
export const arbLinearPipeline = (minNodes: number = 2, maxNodes: number = 10): fc.Arbitrary<PipelineGraph> => {
  return fc.integer({ min: minNodes, max: maxNodes }).chain(nodeCount => {
    const nodeIds = Array.from({ length: nodeCount }, (_, i) => `node-${i}`);

    return fc.tuple(
      ...nodeIds.map(id => arbNode(id))
    ).chain(nodes => {
      const edges: fc.Arbitrary<Edge<TestEdgeData>>[] = [];
      for (let i = 0; i < nodeCount - 1; i++) {
        edges.push(arbEdge(nodeIds[i], nodeIds[i + 1]));
      }

      return edges.length > 0
        ? fc.tuple(...edges).map(edgeList => ({
          nodes: nodes as Node<TestNodeData>[],
          edges: edgeList
        }))
        : fc.constant({
          nodes: nodes as Node<TestNodeData>[],
          edges: []
        });
    });
  });
};

/**
 * Generates a branching pipeline (one root, multiple branches)
 * Example:     B
 *            /   \
 *           A     D
 *            \   /
 *             C
 */
export const arbBranchingPipeline = (): fc.Arbitrary<PipelineGraph> => {
  return fc.integer({ min: 2, max: 5 }).chain(branchCount => {
    const rootId = 'root';
    const branchIds = Array.from({ length: branchCount }, (_, i) => `branch-${i}`);
    const allIds = [rootId, ...branchIds];

    return fc.tuple(
      ...allIds.map(id => arbNode(id))
    ).chain(nodes => {
      const edgeArbs = branchIds.map(branchId => arbEdge(rootId, branchId));

      return fc.tuple(...edgeArbs).map(edges => ({
        nodes: nodes as Node<TestNodeData>[],
        edges
      }));
    });
  });
};

/**
 * Generates a diamond-shaped pipeline (convergence and divergence)
 * Example:     B
 *            /   \
 *           A     D
 *            \   /
 *             C
 */
export const arbDiamondPipeline = (): fc.Arbitrary<PipelineGraph> => {
  const nodeIds = ['start', 'left', 'right', 'end'];

  return fc.tuple(
    ...nodeIds.map(id => arbNode(id))
  ).chain(nodes => {
    return fc.tuple(
      arbEdge('start', 'left'),
      arbEdge('start', 'right'),
      arbEdge('left', 'end'),
      arbEdge('right', 'end')
    ).map(edges => ({
      nodes: nodes as Node<TestNodeData>[],
      edges
    }));
  });
};

/**
 * Generates a random DAG with specified number of nodes
 * Uses a layered approach to ensure acyclicity
 */
export const arbDAG = (minNodes: number = 3, maxNodes: number = 10): fc.Arbitrary<PipelineGraph> => {
  return fc.integer({ min: minNodes, max: maxNodes }).chain(nodeCount => {
    const nodeIds = Array.from({ length: nodeCount }, (_, i) => `node-${i}`);

    return fc.tuple(
      ...nodeIds.map(id => arbNode(id))
    ).chain(nodes => {
      // Generate edges only from lower index to higher index (ensures DAG)
      const possibleEdges: Array<[string, string]> = [];
      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          possibleEdges.push([nodeIds[i], nodeIds[j]]);
        }
      }

      // Randomly select a subset of possible edges
      return fc.subarray(possibleEdges, { minLength: nodeCount - 1, maxLength: possibleEdges.length })
        .chain(selectedEdgePairs => {
          const edgeArbs = selectedEdgePairs.map(([source, target]) => arbEdge(source, target));

          return edgeArbs.length > 0
            ? fc.tuple(...edgeArbs).map(edges => ({
              nodes: nodes as Node<TestNodeData>[],
              edges
            }))
            : fc.constant({
              nodes: nodes as Node<TestNodeData>[],
              edges: []
            });
        });
    });
  });
};

/**
 * Generates an empty pipeline (no nodes, no edges)
 */
export const arbEmptyPipeline = (): fc.Arbitrary<PipelineGraph> => {
  return fc.constant({
    nodes: [],
    edges: []
  });
};

/**
 * Generates a single-node pipeline (one node, no edges)
 */
export const arbSingleNodePipeline = (): fc.Arbitrary<PipelineGraph> => {
  return arbNode('single').map(node => ({
    nodes: [node],
    edges: []
  }));
};

/**
 * Generates a pipeline with disconnected components
 */
export const arbDisconnectedPipeline = (): fc.Arbitrary<PipelineGraph> => {
  return fc.integer({ min: 2, max: 4 }).chain(componentCount => {
    const components: fc.Arbitrary<PipelineGraph>[] = [];

    for (let i = 0; i < componentCount; i++) {
      components.push(
        arbLinearPipeline(2, 3).map(graph => ({
          nodes: graph.nodes.map(n => ({ ...n, id: `comp${i}-${n.id}` })),
          edges: graph.edges.map(e => ({
            ...e,
            id: `comp${i}-${e.id}`,
            source: `comp${i}-${e.source}`,
            target: `comp${i}-${e.target}`
          }))
        }))
      );
    }

    return fc.tuple(...components).map(graphs => ({
      nodes: graphs.flatMap(g => g.nodes),
      edges: graphs.flatMap(g => g.edges)
    }));
  });
};

/**
 * Generates any valid pipeline structure
 */
export const arbPipeline = (): fc.Arbitrary<PipelineGraph> => {
  return fc.oneof(
    arbLinearPipeline(),
    arbBranchingPipeline(),
    arbDiamondPipeline(),
    arbDAG(),
    arbEmptyPipeline(),
    arbSingleNodePipeline(),
    arbDisconnectedPipeline()
  );
};

// ============================================================================
// Helper Functions for Test Assertions
// ============================================================================

/**
 * Checks if a node has a specific status
 */
export const hasNodeStatus = (
  nodes: Node<TestNodeData>[],
  nodeId: string,
  expectedStatus: PipelineStatus
): boolean => {
  const node = nodes.find(n => n.id === nodeId);
  return node?.data?.status === expectedStatus;
};

/**
 * Checks if all nodes have a specific status
 */
export const allNodesHaveStatus = (
  nodes: Node<TestNodeData>[],
  expectedStatus: PipelineStatus
): boolean => {
  return nodes.every(n => n.data?.status === expectedStatus);
};

/**
 * Checks if an edge has a specific status
 */
export const hasEdgeStatus = (
  edges: Edge<TestEdgeData>[],
  edgeId: string,
  expectedStatus: PipelineStatus
): boolean => {
  const edge = edges.find(e => e.id === edgeId);
  return edge?.data?.status === expectedStatus;
};

/**
 * Checks if all edges have a specific status
 */
export const allEdgesHaveStatus = (
  edges: Edge<TestEdgeData>[],
  expectedStatus: PipelineStatus
): boolean => {
  return edges.every(e => e.data?.status === expectedStatus);
};

/**
 * Gets all incoming edges for a node
 */
export const getIncomingEdges = (
  edges: Edge<TestEdgeData>[],
  nodeId: string
): Edge<TestEdgeData>[] => {
  return edges.filter(e => e.target === nodeId);
};

/**
 * Gets all outgoing edges for a node
 */
export const getOutgoingEdges = (
  edges: Edge<TestEdgeData>[],
  nodeId: string
): Edge<TestEdgeData>[] => {
  return edges.filter(e => e.source === nodeId);
};

/**
 * Finds root nodes (nodes with no incoming edges)
 */
export const getRootNodes = (
  nodes: Node<TestNodeData>[],
  edges: Edge<TestEdgeData>[]
): Node<TestNodeData>[] => {
  const nodesWithIncoming = new Set(edges.map(e => e.target));
  return nodes.filter(n => !nodesWithIncoming.has(n.id));
};

/**
 * Checks if a notification was called with specific parameters
 */
export const wasNotificationCalled = (
  mockNotify: jest.Mock,
  type: 'info' | 'error' | 'warning',
  messagePattern?: string | RegExp
): boolean => {
  const calls = mockNotify.mock.calls;

  return calls.some(call => {
    const [callType, callMessage] = call;
    const typeMatches = callType === type;

    if (!messagePattern) {
      return typeMatches;
    }

    if (typeof messagePattern === 'string') {
      return typeMatches && callMessage.includes(messagePattern);
    }

    return typeMatches && messagePattern.test(callMessage);
  });
};

/**
 * Counts notifications of a specific type
 */
export const countNotifications = (
  mockNotify: jest.Mock,
  type?: 'info' | 'error' | 'warning'
): number => {
  if (!type) {
    return mockNotify.mock.calls.length;
  }

  return mockNotify.mock.calls.filter(call => call[0] === type).length;
};

/**
 * Verifies topological ordering of an execution plan
 * Returns true if for every edge (A -> B), A appears before B in the plan
 */
export const isTopologicalOrder = (
  executionPlan: string[],
  edges: Edge<TestEdgeData>[]
): boolean => {
  const positionMap = new Map<string, number>();
  executionPlan.forEach((nodeId, index) => {
    positionMap.set(nodeId, index);
  });

  for (const edge of edges) {
    const sourcePos = positionMap.get(edge.source);
    const targetPos = positionMap.get(edge.target);

    // If both nodes are in the plan, source must come before target
    if (sourcePos !== undefined && targetPos !== undefined) {
      if (sourcePos >= targetPos) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Checks if two arrays are deeply equal
 */
export const arraysEqual = <T>(arr1: T[], arr2: T[]): boolean => {
  if (arr1.length !== arr2.length) return false;
  return arr1.every((val, index) => val === arr2[index]);
};

/**
 * Creates a mock notification function for testing
 */
export const createMockNotify = (): jest.Mock<void, [type: 'info' | 'error' | 'warning', message: string]> => {
  return jest.fn();
};

/**
 * Creates mock setNodes and setEdges functions that capture updates
 */
export const createMockSetters = () => {
  let currentNodes: Node<TestNodeData>[] = [];
  let currentEdges: Edge<TestEdgeData>[] = [];

  const setNodes = jest.fn((updater: React.SetStateAction<Node<TestNodeData>[]>) => {
    if (typeof updater === 'function') {
      currentNodes = updater(currentNodes);
    } else {
      currentNodes = updater;
    }
  });

  const setEdges = jest.fn((updater: React.SetStateAction<Edge<TestEdgeData>[]>) => {
    if (typeof updater === 'function') {
      currentEdges = updater(currentEdges);
    } else {
      currentEdges = updater;
    }
  });

  const getNodes = () => currentNodes;
  const getEdges = () => currentEdges;
  const resetNodes = (nodes: Node<TestNodeData>[]) => { currentNodes = nodes; };
  const resetEdges = (edges: Edge<TestEdgeData>[]) => { currentEdges = edges; };

  return {
    setNodes,
    setEdges,
    getNodes,
    getEdges,
    resetNodes,
    resetEdges
  };
};

// ============================================================================
// Test Configuration
// ============================================================================

/**
 * Default configuration for property-based tests
 */
export const PBT_CONFIG = {
  numRuns: 100, // Minimum 100 iterations per property test
  timeout: 30000, // 30 second timeout for property tests
  verbose: false
};

/**
 * Creates fast-check parameters with default configuration
 */
export const createFCParams = (overrides?: Partial<fc.Parameters<unknown>>): fc.Parameters<unknown> => {
  return {
    numRuns: PBT_CONFIG.numRuns,
    verbose: PBT_CONFIG.verbose,
    ...overrides
  };
};
