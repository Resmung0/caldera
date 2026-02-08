/**
 * Unit tests for processNodeStep function - Task 6.1
 * 
 * These tests verify that the processNodeStep helper function correctly
 * processes a single node step in the pipeline execution, including:
 * - Updating node status to 'processing'
 * - Finding and animating incoming edges
 * - Waiting for step delay
 * - Checking shouldStopRef
 * - Updating statuses to 'success' or 'failed'
 * - Returning execution result
 * 
 * Feature: pipeline-runner-refactoring
 * Task: 6.1 Create processNodeStep function
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { Edge } from 'reactflow';
import { processNodeStep, PipelineStatus } from '../src/webview/hooks/usePipelineRunner';

describe('processNodeStep - Task 6.1', () => {
  let updateNodeStatus: jest.Mock;
  let updateEdgeStatus: jest.Mock;
  let shouldStopRef: React.MutableRefObject<boolean>;

  beforeEach(() => {
    updateNodeStatus = jest.fn();
    updateEdgeStatus = jest.fn();
    shouldStopRef = { current: false };
    jest.clearAllMocks();
  });

  describe('Basic node processing', () => {
    test('updates node status to processing at start', async () => {
      // Arrange
      const nodeId = 'node-1';
      const edges: Edge[] = [];
      const stepDelay = 10;

      // Act
      await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      expect(updateNodeStatus).toHaveBeenCalledWith('node-1', 'processing');
      // Should be called first
      expect(updateNodeStatus.mock.calls[0]).toEqual(['node-1', 'processing']);
    });

    test('updates node status to success after processing', async () => {
      // Arrange
      const nodeId = 'node-1';
      const edges: Edge[] = [];
      const stepDelay = 10;

      // Act
      const result = await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      expect(updateNodeStatus).toHaveBeenCalledWith('node-1', 'success');
      expect(result.success).toBe(true);
      expect(result.stopped).toBe(false);
    });

    test('returns success result when node processing completes', async () => {
      // Arrange
      const nodeId = 'node-1';
      const edges: Edge[] = [];
      const stepDelay = 10;

      // Act
      const result = await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      expect(result).toEqual({ success: true, stopped: false });
    });
  });

  describe('Edge animation', () => {
    test('animates incoming edges to processing', async () => {
      // Arrange
      const nodeId = 'node-2';
      const edges: Edge[] = [
        { id: 'e1-2', source: 'node-1', target: 'node-2', data: {} },
        { id: 'e3-2', source: 'node-3', target: 'node-2', data: {} },
        { id: 'e2-4', source: 'node-2', target: 'node-4', data: {} }, // outgoing, should not be animated
      ];
      const stepDelay = 10;

      // Act
      await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      expect(updateEdgeStatus).toHaveBeenCalledWith('e1-2', 'processing');
      expect(updateEdgeStatus).toHaveBeenCalledWith('e3-2', 'processing');
      expect(updateEdgeStatus).not.toHaveBeenCalledWith('e2-4', 'processing');
    });

    test('updates incoming edges to success after processing', async () => {
      // Arrange
      const nodeId = 'node-2';
      const edges: Edge[] = [
        { id: 'e1-2', source: 'node-1', target: 'node-2', data: {} },
      ];
      const stepDelay = 10;

      // Act
      await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      expect(updateEdgeStatus).toHaveBeenCalledWith('e1-2', 'success');
    });

    test('handles node with no incoming edges', async () => {
      // Arrange
      const nodeId = 'root-node';
      const edges: Edge[] = [
        { id: 'e1-2', source: 'root-node', target: 'node-2', data: {} },
      ];
      const stepDelay = 10;

      // Act
      const result = await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      expect(result.success).toBe(true);
      expect(updateNodeStatus).toHaveBeenCalledWith('root-node', 'processing');
      expect(updateNodeStatus).toHaveBeenCalledWith('root-node', 'success');
      // Should not call updateEdgeStatus for processing or success since no incoming edges
      expect(updateEdgeStatus).not.toHaveBeenCalled();
    });

    test('handles multiple incoming edges correctly', async () => {
      // Arrange
      const nodeId = 'convergence-node';
      const edges: Edge[] = [
        { id: 'e1-c', source: 'node-1', target: 'convergence-node', data: {} },
        { id: 'e2-c', source: 'node-2', target: 'convergence-node', data: {} },
        { id: 'e3-c', source: 'node-3', target: 'convergence-node', data: {} },
      ];
      const stepDelay = 10;

      // Act
      await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      // All incoming edges should be set to processing
      expect(updateEdgeStatus).toHaveBeenCalledWith('e1-c', 'processing');
      expect(updateEdgeStatus).toHaveBeenCalledWith('e2-c', 'processing');
      expect(updateEdgeStatus).toHaveBeenCalledWith('e3-c', 'processing');
      // All incoming edges should be set to success
      expect(updateEdgeStatus).toHaveBeenCalledWith('e1-c', 'success');
      expect(updateEdgeStatus).toHaveBeenCalledWith('e2-c', 'success');
      expect(updateEdgeStatus).toHaveBeenCalledWith('e3-c', 'success');
    });
  });

  describe('Stop handling', () => {
    test('stops processing when shouldStopRef is true', async () => {
      // Arrange
      const nodeId = 'node-1';
      const edges: Edge[] = [];
      const stepDelay = 10;
      shouldStopRef.current = true;

      // Act
      const result = await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      expect(result.success).toBe(false);
      expect(result.stopped).toBe(true);
    });

    test('resets node status to idle when stopped', async () => {
      // Arrange
      const nodeId = 'node-1';
      const edges: Edge[] = [];
      const stepDelay = 10;
      shouldStopRef.current = true;

      // Act
      await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      expect(updateNodeStatus).toHaveBeenCalledWith('node-1', 'idle');
    });

    test('resets incoming edges to idle when stopped', async () => {
      // Arrange
      const nodeId = 'node-2';
      const edges: Edge[] = [
        { id: 'e1-2', source: 'node-1', target: 'node-2', data: {} },
        { id: 'e3-2', source: 'node-3', target: 'node-2', data: {} },
      ];
      const stepDelay = 10;
      shouldStopRef.current = true;

      // Act
      await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      expect(updateEdgeStatus).toHaveBeenCalledWith('e1-2', 'idle');
      expect(updateEdgeStatus).toHaveBeenCalledWith('e3-2', 'idle');
    });

    test('does not set success status when stopped', async () => {
      // Arrange
      const nodeId = 'node-1';
      const edges: Edge[] = [];
      const stepDelay = 10;
      shouldStopRef.current = true;

      // Act
      await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      expect(updateNodeStatus).not.toHaveBeenCalledWith('node-1', 'success');
      expect(updateNodeStatus).not.toHaveBeenCalledWith('node-1', 'failed');
    });
  });

  describe('Timing and delays', () => {
    test('waits for stepDelay before completing', async () => {
      // Arrange
      const nodeId = 'node-1';
      const edges: Edge[] = [];
      const stepDelay = 50;
      const startTime = Date.now();

      // Act
      await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);
      const endTime = Date.now();

      // Assert
      const elapsed = endTime - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(stepDelay - 10); // Allow 10ms tolerance
    });

    test('respects different step delays', async () => {
      // Arrange
      const nodeId = 'node-1';
      const edges: Edge[] = [];
      const stepDelay = 100;
      const startTime = Date.now();

      // Act
      await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);
      const endTime = Date.now();

      // Assert
      const elapsed = endTime - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(stepDelay - 10); // Allow 10ms tolerance
    });
  });

  describe('Status update sequence', () => {
    test('calls status updates in correct order', async () => {
      // Arrange
      const nodeId = 'node-2';
      const edges: Edge[] = [
        { id: 'e1-2', source: 'node-1', target: 'node-2', data: {} },
      ];
      const stepDelay = 10;
      const callOrder: string[] = [];

      updateNodeStatus.mockImplementation((id, status) => {
        callOrder.push(`node:${id}:${status}`);
      });

      updateEdgeStatus.mockImplementation((id, status) => {
        callOrder.push(`edge:${id}:${status}`);
      });

      // Act
      await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      expect(callOrder).toEqual([
        'node:node-2:processing',
        'edge:e1-2:processing',
        'node:node-2:success',
        'edge:e1-2:success',
      ]);
    });

    test('processes node status before edge status', async () => {
      // Arrange
      const nodeId = 'node-2';
      const edges: Edge[] = [
        { id: 'e1-2', source: 'node-1', target: 'node-2', data: {} },
      ];
      const stepDelay = 10;

      // Act
      await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      // Node should be set to processing before edges
      expect(updateNodeStatus.mock.invocationCallOrder[0]).toBeLessThan(
        updateEdgeStatus.mock.invocationCallOrder[0]
      );
    });
  });

  describe('Edge cases', () => {
    test('handles empty edges array', async () => {
      // Arrange
      const nodeId = 'node-1';
      const edges: Edge[] = [];
      const stepDelay = 10;

      // Act
      const result = await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      expect(result.success).toBe(true);
      expect(result.stopped).toBe(false);
      expect(updateNodeStatus).toHaveBeenCalledTimes(2); // processing and success
      expect(updateEdgeStatus).not.toHaveBeenCalled();
    });

    test('handles zero step delay', async () => {
      // Arrange
      const nodeId = 'node-1';
      const edges: Edge[] = [];
      const stepDelay = 0;

      // Act
      const result = await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      expect(result.success).toBe(true);
      expect(result.stopped).toBe(false);
    });

    test('handles very short step delay', async () => {
      // Arrange
      const nodeId = 'node-1';
      const edges: Edge[] = [];
      const stepDelay = 1;

      // Act
      const result = await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      expect(result.success).toBe(true);
      expect(result.stopped).toBe(false);
    });
  });

  describe('Integration with status callbacks', () => {
    test('passes correct nodeId to updateNodeStatus', async () => {
      // Arrange
      const nodeId = 'specific-node-id';
      const edges: Edge[] = [];
      const stepDelay = 10;

      // Act
      await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      expect(updateNodeStatus).toHaveBeenCalledWith('specific-node-id', 'processing');
      expect(updateNodeStatus).toHaveBeenCalledWith('specific-node-id', 'success');
    });

    test('passes correct edgeId to updateEdgeStatus', async () => {
      // Arrange
      const nodeId = 'node-2';
      const edges: Edge[] = [
        { id: 'custom-edge-id', source: 'node-1', target: 'node-2', data: {} },
      ];
      const stepDelay = 10;

      // Act
      await processNodeStep(nodeId, edges, updateNodeStatus, updateEdgeStatus, stepDelay, shouldStopRef);

      // Assert
      expect(updateEdgeStatus).toHaveBeenCalledWith('custom-edge-id', 'processing');
      expect(updateEdgeStatus).toHaveBeenCalledWith('custom-edge-id', 'success');
    });

    test('works with different callback implementations', async () => {
      // Arrange
      const nodeId = 'node-1';
      const edges: Edge[] = [];
      const stepDelay = 10;
      const customUpdateNode = jest.fn();
      const customUpdateEdge = jest.fn();

      // Act
      const result = await processNodeStep(nodeId, edges, customUpdateNode, customUpdateEdge, stepDelay, shouldStopRef);

      // Assert
      expect(result.success).toBe(true);
      expect(customUpdateNode).toHaveBeenCalled();
    });
  });
});
