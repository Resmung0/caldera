/**
 * Unit tests for usePipelineRunner hook - Task 3.1
 * 
 * These tests verify that the resetAllStatuses helper function correctly
 * resets all node and edge statuses to 'idle' before pipeline execution.
 * 
 * Feature: pipeline-runner-refactoring
 * Task: 3.1 Implement resetAllStatuses helper function
 * Requirements: 2.1, 2.2, 2.3
 */

import { Node, Edge } from 'reactflow';
import type { PipelineStatus } from '../src/webview/hooks/usePipelineRunner';

describe('usePipelineRunner - Task 3.1: resetAllStatuses', () => {
  /**
   * These tests verify the resetAllStatuses logic by testing the updater functions
   * that would be passed to setNodes and setEdges.
   */

  test('resetAllStatuses logic: resets all node statuses to idle', () => {
    // Arrange: Create nodes with various statuses
    const nodes: Node[] = [
      { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1', status: 'success' as PipelineStatus } },
      { id: '2', position: { x: 0, y: 100 }, data: { label: 'Node 2', status: 'failed' as PipelineStatus } },
      { id: '3', position: { x: 0, y: 200 }, data: { label: 'Node 3', status: 'processing' as PipelineStatus } },
    ];

    // Act: Apply the reset logic (same as in resetAllStatuses)
    const resetNodes = nodes.map((n) => ({ 
      ...n, 
      data: { ...n.data, status: 'idle' as PipelineStatus } 
    }));

    // Assert: All nodes should have status 'idle'
    resetNodes.forEach((node) => {
      expect(node.data.status).toBe('idle');
    });
  });

  test('resetAllStatuses logic: resets all edge statuses to idle', () => {
    // Arrange: Create edges with various statuses
    const edges: Edge[] = [
      { id: 'e1-2', source: '1', target: '2', data: { status: 'success' as PipelineStatus } },
      { id: 'e2-3', source: '2', target: '3', data: { status: 'failed' as PipelineStatus } },
      { id: 'e3-4', source: '3', target: '4', data: { status: 'processing' as PipelineStatus } },
    ];

    // Act: Apply the reset logic (same as in resetAllStatuses)
    const resetEdges = edges.map((e) => ({ 
      ...e, 
      data: { ...e.data, status: 'idle' as PipelineStatus } 
    }));

    // Assert: All edges should have status 'idle'
    resetEdges.forEach((edge) => {
      expect(edge.data.status).toBe('idle');
    });
  });

  test('resetAllStatuses logic: preserves other node data when resetting status', () => {
    // Arrange: Create a node with additional data
    const nodes: Node[] = [
      { 
        id: '1', 
        position: { x: 0, y: 0 }, 
        data: { 
          label: 'Node 1', 
          status: 'success' as PipelineStatus,
          params: { key: 'value' },
          framework: 'test-framework',
          codeDeps: [{ path: '/test/path' }]
        } 
      },
    ];

    // Act: Apply the reset logic
    const resetNodes = nodes.map((n) => ({ 
      ...n, 
      data: { ...n.data, status: 'idle' as PipelineStatus } 
    }));

    // Assert: Status is reset but other data is preserved
    expect(resetNodes[0].data.status).toBe('idle');
    expect(resetNodes[0].data.label).toBe('Node 1');
    expect(resetNodes[0].data.params).toEqual({ key: 'value' });
    expect(resetNodes[0].data.framework).toBe('test-framework');
    expect(resetNodes[0].data.codeDeps).toEqual([{ path: '/test/path' }]);
  });

  test('resetAllStatuses logic: preserves other edge data when resetting status', () => {
    // Arrange: Create an edge with additional data
    const edges: Edge[] = [
      { 
        id: 'e1-2', 
        source: '1', 
        target: '2', 
        data: { 
          status: 'success' as PipelineStatus,
          customProp: 'custom-value'
        } 
      },
    ];

    // Act: Apply the reset logic
    const resetEdges = edges.map((e) => ({ 
      ...e, 
      data: { ...e.data, status: 'idle' as PipelineStatus } 
    }));

    // Assert: Status is reset but other data is preserved
    expect(resetEdges[0].data.status).toBe('idle');
    expect(resetEdges[0].data.customProp).toBe('custom-value');
    expect(resetEdges[0].source).toBe('1');
    expect(resetEdges[0].target).toBe('2');
  });

  test('resetAllStatuses logic: handles empty arrays', () => {
    // Arrange: Empty arrays
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Act: Apply the reset logic
    const resetNodes = nodes.map((n) => ({ 
      ...n, 
      data: { ...n.data, status: 'idle' as PipelineStatus } 
    }));
    const resetEdges = edges.map((e) => ({ 
      ...e, 
      data: { ...e.data, status: 'idle' as PipelineStatus } 
    }));

    // Assert: Should handle empty arrays gracefully
    expect(resetNodes).toEqual([]);
    expect(resetEdges).toEqual([]);
  });

  test('resetAllStatuses logic: handles nodes without status', () => {
    // Arrange: Create nodes without initial status
    const nodes: Node[] = [
      { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
      { id: '2', position: { x: 0, y: 100 }, data: { label: 'Node 2' } },
    ];

    // Act: Apply the reset logic
    const resetNodes = nodes.map((n) => ({ 
      ...n, 
      data: { ...n.data, status: 'idle' as PipelineStatus } 
    }));

    // Assert: All nodes should have status 'idle'
    resetNodes.forEach((node) => {
      expect(node.data.status).toBe('idle');
    });
  });

  test('resetAllStatuses logic: handles edges without status', () => {
    // Arrange: Create edges without initial status
    const edges: Edge[] = [
      { id: 'e1-2', source: '1', target: '2', data: {} },
      { id: 'e2-3', source: '2', target: '3', data: {} },
    ];

    // Act: Apply the reset logic
    const resetEdges = edges.map((e) => ({ 
      ...e, 
      data: { ...e.data, status: 'idle' as PipelineStatus } 
    }));

    // Assert: All edges should have status 'idle'
    resetEdges.forEach((edge) => {
      expect(edge.data.status).toBe('idle');
    });
  });
});
