/**
 * Unit tests for buildExecutionPlan function - Task 5.1
 * 
 * These tests verify that the buildExecutionPlan function correctly performs
 * topological sort using BFS traversal to determine pipeline execution order.
 * 
 * Feature: pipeline-runner-refactoring
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
 */

import { Node, Edge } from 'reactflow';
import { buildExecutionPlan } from '../src/webview/hooks/usePipelineRunner';
import { isTopologicalOrder } from './pipelineTestUtils';

describe('buildExecutionPlan - Task 5.1', () => {
  /**
   * Test linear pipeline execution order
   * Structure: A -> B -> C
   */
  test('should return correct order for linear pipeline', () => {
    const nodes: Node[] = [
      { id: 'A', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node A' } },
      { id: 'B', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node B' } },
      { id: 'C', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node C' } }
    ];

    const edges: Edge[] = [
      { id: 'A-B', source: 'A', target: 'B' },
      { id: 'B-C', source: 'B', target: 'C' }
    ];

    const plan = buildExecutionPlan(nodes, edges);

    expect(plan).toEqual(['A', 'B', 'C']);
  });

  /**
   * Test branching pipeline execution order
   * Structure:     B
   *              /
   *             A
   *              \
   *               C
   */
  test('should return correct order for branching pipeline', () => {
    const nodes: Node[] = [
      { id: 'A', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Root' } },
      { id: 'B', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Branch 1' } },
      { id: 'C', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Branch 2' } }
    ];

    const edges: Edge[] = [
      { id: 'A-B', source: 'A', target: 'B' },
      { id: 'A-C', source: 'A', target: 'C' }
    ];

    const plan = buildExecutionPlan(nodes, edges);

    // A must be first, B and C can be in any order after A
    expect(plan[0]).toBe('A');
    expect(plan).toContain('B');
    expect(plan).toContain('C');
    expect(plan.length).toBe(3);
  });

  /**
   * Test diamond pattern execution order
   * Structure:     B
   *              /   \
   *             A     D
   *              \   /
   *               C
   */
  test('should return correct order for diamond pipeline', () => {
    const nodes: Node[] = [
      { id: 'A', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Start' } },
      { id: 'B', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Left' } },
      { id: 'C', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Right' } },
      { id: 'D', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'End' } }
    ];

    const edges: Edge[] = [
      { id: 'A-B', source: 'A', target: 'B' },
      { id: 'A-C', source: 'A', target: 'C' },
      { id: 'B-D', source: 'B', target: 'D' },
      { id: 'C-D', source: 'C', target: 'D' }
    ];

    const plan = buildExecutionPlan(nodes, edges);

    // Verify topological ordering
    const aIndex = plan.indexOf('A');
    const bIndex = plan.indexOf('B');
    const cIndex = plan.indexOf('C');
    const dIndex = plan.indexOf('D');

    // A must come before B and C
    expect(aIndex).toBeLessThan(bIndex);
    expect(aIndex).toBeLessThan(cIndex);

    // B and C must come before D
    expect(bIndex).toBeLessThan(dIndex);
    expect(cIndex).toBeLessThan(dIndex);

    expect(plan.length).toBe(4);
  });

  /**
   * Test empty pipeline
   */
  test('should return empty array for empty pipeline', () => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const plan = buildExecutionPlan(nodes, edges);

    expect(plan).toEqual([]);
  });

  /**
   * Test single node pipeline
   */
  test('should return single node for single-node pipeline', () => {
    const nodes: Node[] = [
      { id: 'A', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Only Node' } }
    ];
    const edges: Edge[] = [];

    const plan = buildExecutionPlan(nodes, edges);

    expect(plan).toEqual(['A']);
  });

  /**
   * Test disconnected components
   * Structure: A -> B    C -> D
   * (two separate chains)
   */
  test('should handle disconnected components', () => {
    const nodes: Node[] = [
      { id: 'A', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Chain 1 Start' } },
      { id: 'B', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Chain 1 End' } },
      { id: 'C', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Chain 2 Start' } },
      { id: 'D', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Chain 2 End' } }
    ];

    const edges: Edge[] = [
      { id: 'A-B', source: 'A', target: 'B' },
      { id: 'C-D', source: 'C', target: 'D' }
    ];

    const plan = buildExecutionPlan(nodes, edges);

    // Verify topological ordering within each chain
    const aIndex = plan.indexOf('A');
    const bIndex = plan.indexOf('B');
    const cIndex = plan.indexOf('C');
    const dIndex = plan.indexOf('D');

    expect(aIndex).toBeLessThan(bIndex);
    expect(cIndex).toBeLessThan(dIndex);
    expect(plan.length).toBe(4);
  });

  /**
   * Test complex DAG with multiple paths
   * Structure:     B -> D
   *              /       \
   *             A         F
   *              \       /
   *               C -> E
   */
  test('should handle complex DAG with multiple paths', () => {
    const nodes: Node[] = [
      { id: 'A', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'B', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'B' } },
      { id: 'C', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'C' } },
      { id: 'D', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'D' } },
      { id: 'E', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'E' } },
      { id: 'F', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'F' } }
    ];

    const edges: Edge[] = [
      { id: 'A-B', source: 'A', target: 'B' },
      { id: 'A-C', source: 'A', target: 'C' },
      { id: 'B-D', source: 'B', target: 'D' },
      { id: 'C-E', source: 'C', target: 'E' },
      { id: 'D-F', source: 'D', target: 'F' },
      { id: 'E-F', source: 'E', target: 'F' }
    ];

    const plan = buildExecutionPlan(nodes, edges);

    // Verify all nodes are included
    expect(plan.length).toBe(6);
    expect(plan).toContain('A');
    expect(plan).toContain('B');
    expect(plan).toContain('C');
    expect(plan).toContain('D');
    expect(plan).toContain('E');
    expect(plan).toContain('F');

    // Verify topological ordering
    const indices = Object.fromEntries(plan.map((id, idx) => [id, idx]));
    
    // A must come before B and C
    expect(indices['A']).toBeLessThan(indices['B']);
    expect(indices['A']).toBeLessThan(indices['C']);
    
    // B must come before D
    expect(indices['B']).toBeLessThan(indices['D']);
    
    // C must come before E
    expect(indices['C']).toBeLessThan(indices['E']);
    
    // D and E must come before F
    expect(indices['D']).toBeLessThan(indices['F']);
    expect(indices['E']).toBeLessThan(indices['F']);
  });

  /**
   * Test purity - function should not mutate inputs
   */
  test('should not mutate input arrays', () => {
    const nodes: Node[] = [
      { id: 'A', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node A' } },
      { id: 'B', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node B' } }
    ];

    const edges: Edge[] = [
      { id: 'A-B', source: 'A', target: 'B' }
    ];

    // Create deep copies to compare
    const nodesCopy = JSON.parse(JSON.stringify(nodes));
    const edgesCopy = JSON.parse(JSON.stringify(edges));

    buildExecutionPlan(nodes, edges);

    // Verify inputs were not mutated
    expect(nodes).toEqual(nodesCopy);
    expect(edges).toEqual(edgesCopy);
  });

  /**
   * Test determinism - same inputs should produce same output
   */
  test('should return same result for same inputs (determinism)', () => {
    const nodes: Node[] = [
      { id: 'A', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node A' } },
      { id: 'B', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node B' } },
      { id: 'C', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node C' } }
    ];

    const edges: Edge[] = [
      { id: 'A-B', source: 'A', target: 'B' },
      { id: 'B-C', source: 'B', target: 'C' }
    ];

    const plan1 = buildExecutionPlan(nodes, edges);
    const plan2 = buildExecutionPlan(nodes, edges);
    const plan3 = buildExecutionPlan(nodes, edges);

    expect(plan1).toEqual(plan2);
    expect(plan2).toEqual(plan3);
  });

  /**
   * Test that all nodes are included in the plan
   */
  test('should include all nodes in the execution plan', () => {
    const nodes: Node[] = [
      { id: 'A', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node A' } },
      { id: 'B', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node B' } },
      { id: 'C', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node C' } },
      { id: 'D', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node D' } }
    ];

    const edges: Edge[] = [
      { id: 'A-B', source: 'A', target: 'B' },
      { id: 'A-C', source: 'A', target: 'C' },
      { id: 'B-D', source: 'B', target: 'D' }
    ];

    const plan = buildExecutionPlan(nodes, edges);

    expect(plan.length).toBe(nodes.length);
    nodes.forEach(node => {
      expect(plan).toContain(node.id);
    });
  });

  /**
   * Test multiple root nodes
   */
  test('should handle multiple root nodes', () => {
    const nodes: Node[] = [
      { id: 'A', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Root 1' } },
      { id: 'B', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Root 2' } },
      { id: 'C', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Child' } }
    ];

    const edges: Edge[] = [
      { id: 'A-C', source: 'A', target: 'C' },
      { id: 'B-C', source: 'B', target: 'C' }
    ];

    const plan = buildExecutionPlan(nodes, edges);

    // Both A and B should come before C
    const aIndex = plan.indexOf('A');
    const bIndex = plan.indexOf('B');
    const cIndex = plan.indexOf('C');

    expect(aIndex).toBeLessThan(cIndex);
    expect(bIndex).toBeLessThan(cIndex);
    expect(plan.length).toBe(3);
  });

  /**
   * Test topological ordering property
   * Validates that the execution plan respects all edge dependencies
   */
  test('should produce topologically ordered execution plan', () => {
    const nodes: Node[] = [
      { id: 'A', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node A' } },
      { id: 'B', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node B' } },
      { id: 'C', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node C' } },
      { id: 'D', type: 'custom', position: { x: 0, y: 0 }, data: { label: 'Node D' } }
    ];

    const edges: Edge[] = [
      { id: 'A-B', source: 'A', target: 'B' },
      { id: 'A-C', source: 'A', target: 'C' },
      { id: 'B-D', source: 'B', target: 'D' },
      { id: 'C-D', source: 'C', target: 'D' }
    ];

    const plan = buildExecutionPlan(nodes, edges);

    // Use the isTopologicalOrder helper to verify the plan
    expect(isTopologicalOrder(plan, edges)).toBe(true);
  });
});
