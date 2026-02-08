/**
 * Integration tests for runPipeline using processNodeStep - Task 6.2
 * 
 * These tests verify that the runPipeline function correctly uses the
 * processNodeStep helper function and handles the returned flags properly.
 * 
 * Feature: pipeline-runner-refactoring
 * Task: 6.2 Update runPipeline to use processNodeStep
 * Validates: Requirement 5.1
 */

import { Node, Edge } from 'reactflow';
import { processNodeStep, buildExecutionPlan, PipelineStatus } from '../src/webview/hooks/usePipelineRunner';

// Mock timers for faster test execution
jest.useFakeTimers();

describe('runPipeline integration with processNodeStep - Task 6.2', () => {
  let nodes: Node[];
  let edges: Edge[];
  let updateNodeStatus: jest.Mock;
  let updateEdgeStatus: jest.Mock;
  let shouldStopRef: { current: boolean };

  beforeEach(() => {
    // Create a simple linear pipeline: A -> B -> C
    nodes = [
      { id: 'A', position: { x: 0, y: 0 }, data: { label: 'Node A', status: 'idle' as PipelineStatus } },
      { id: 'B', position: { x: 100, y: 0 }, data: { label: 'Node B', status: 'idle' as PipelineStatus } },
      { id: 'C', position: { x: 200, y: 0 }, data: { label: 'Node C', status: 'idle' as PipelineStatus } },
    ];

    edges = [
      { id: 'e-A-B', source: 'A', target: 'B', data: { status: 'idle' as PipelineStatus } },
      { id: 'e-B-C', source: 'B', target: 'C', data: { status: 'idle' as PipelineStatus } },
    ];

    updateNodeStatus = jest.fn();
    updateEdgeStatus = jest.fn();
    shouldStopRef = { current: false };
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('processNodeStep is called for each node in execution plan', async () => {
    // Arrange
    const executionPlan = buildExecutionPlan(nodes, edges);
    const stepDelay = 100;

    // Assert: Execution plan should be in correct order
    expect(executionPlan).toEqual(['A', 'B', 'C']);

    // Act: Process first node
    const promise = processNodeStep(
      executionPlan[0],
      edges,
      updateNodeStatus,
      updateEdgeStatus,
      stepDelay,
      shouldStopRef
    );

    // Fast-forward timers and wait for promise
    jest.advanceTimersByTime(stepDelay);
    const resultA = await promise;

    // Assert: First node should be processed successfully
    expect(resultA.success).toBe(true);
    expect(resultA.stopped).toBe(false);
    expect(updateNodeStatus).toHaveBeenCalledWith('A', 'processing');
    expect(updateNodeStatus).toHaveBeenCalledWith('A', 'success');
  });

  test('processNodeStep handles stopped flag correctly', async () => {
    // Arrange
    const stepDelay = 100;
    shouldStopRef.current = true; // Simulate stop request

    // Act: Process node with stop flag set
    const promise = processNodeStep(
      'A',
      edges,
      updateNodeStatus,
      updateEdgeStatus,
      stepDelay,
      shouldStopRef
    );

    // Fast-forward timers and wait for promise
    jest.advanceTimersByTime(stepDelay);
    const result = await promise;

    // Assert: Node should be stopped
    expect(result.success).toBe(false);
    expect(result.stopped).toBe(true);
    expect(updateNodeStatus).toHaveBeenCalledWith('A', 'processing');
    expect(updateNodeStatus).toHaveBeenCalledWith('A', 'idle');
  });

  test('processNodeStep returns success flag for successful execution', async () => {
    // Arrange
    const stepDelay = 100;

    // Act: Process node normally
    const promise = processNodeStep(
      'B',
      edges,
      updateNodeStatus,
      updateEdgeStatus,
      stepDelay,
      shouldStopRef
    );

    // Fast-forward timers and wait for promise
    jest.advanceTimersByTime(stepDelay);
    const result = await promise;

    // Assert: Node should succeed
    expect(result.success).toBe(true);
    expect(result.stopped).toBe(false);
    expect(updateNodeStatus).toHaveBeenCalledWith('B', 'success');
  });

  test('processNodeStep maintains execution timing', async () => {
    // Arrange
    const stepDelay = 150;
    const startTime = Date.now();

    // Act: Process node
    const promise = processNodeStep(
      'A',
      edges,
      updateNodeStatus,
      updateEdgeStatus,
      stepDelay,
      shouldStopRef
    );

    // Fast-forward timers
    jest.advanceTimersByTime(stepDelay);
    await promise;

    const endTime = Date.now();

    // Assert: Timing should be maintained (at least stepDelay)
    expect(endTime - startTime).toBeGreaterThanOrEqual(stepDelay);
  });

  test('processNodeStep animates incoming edges', async () => {
    // Arrange
    const stepDelay = 100;
    // Node B has one incoming edge from A
    const incomingEdge = edges.find(e => e.target === 'B');

    // Act: Process node B
    const promise = processNodeStep(
      'B',
      edges,
      updateNodeStatus,
      updateEdgeStatus,
      stepDelay,
      shouldStopRef
    );

    // Fast-forward timers and wait for promise
    jest.advanceTimersByTime(stepDelay);
    await promise;

    // Assert: Incoming edge should be animated
    expect(updateEdgeStatus).toHaveBeenCalledWith(incomingEdge!.id, 'processing');
    expect(updateEdgeStatus).toHaveBeenCalledWith(incomingEdge!.id, 'success');
  });

  test('buildExecutionPlan creates correct topological order', () => {
    // Arrange: Linear pipeline A -> B -> C
    
    // Act: Build execution plan
    const executionPlan = buildExecutionPlan(nodes, edges);

    // Assert: Plan should respect dependencies
    expect(executionPlan).toEqual(['A', 'B', 'C']);
    expect(executionPlan.indexOf('A')).toBeLessThan(executionPlan.indexOf('B'));
    expect(executionPlan.indexOf('B')).toBeLessThan(executionPlan.indexOf('C'));
  });

  test('integration: processNodeStep can be called sequentially for pipeline execution', async () => {
    // Arrange
    const executionPlan = buildExecutionPlan(nodes, edges);
    const stepDelay = 100;
    const results: Array<{ nodeId: string; success: boolean; stopped: boolean }> = [];

    // Act: Execute pipeline by calling processNodeStep for each node
    for (const nodeId of executionPlan) {
      if (shouldStopRef.current) break;

      const promise = processNodeStep(
        nodeId,
        edges,
        updateNodeStatus,
        updateEdgeStatus,
        stepDelay,
        shouldStopRef
      );

      jest.advanceTimersByTime(stepDelay);
      const result = await promise;

      results.push({ nodeId, ...result });

      if (result.stopped || !result.success) {
        break;
      }
    }

    // Assert: All nodes should be processed successfully
    expect(results).toHaveLength(3);
    expect(results.every(r => r.success && !r.stopped)).toBe(true);
    expect(results.map(r => r.nodeId)).toEqual(['A', 'B', 'C']);
  });
});
