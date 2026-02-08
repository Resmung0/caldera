/**
 * @jest-environment jsdom
 */
/**
 * Property-based tests for Status Reset and Preservation - Tasks 3.2 & 3.3
 * 
 * Feature: pipeline-runner-refactoring
 * Property 2: Status Reset Before Execution
 * Property 3: Status Preservation on Stop
 */

import * as fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { usePipelineRunner, PipelineStatus } from '../src/webview/hooks/usePipelineRunner';
import { arbPipeline, createMockNotify, createFCParams, createMockSetters } from './pipelineTestUtils';
import { Node, Edge } from 'reactflow';
import React from 'react';

// Mock timers for fast execution
jest.useFakeTimers();
jest.setTimeout(60000);

/**
 * Helper to advance fake timers until a promise resolves.
 */
async function advanceUntilDone(promise: Promise<void>) {
    let done = false;
    promise.finally(() => { done = true; });
    let iterations = 0;
    while (!done && iterations < 100) {
        iterations++;
        await act(async () => {
            jest.runAllTimers();
            await Promise.resolve();
        });
    }
}

describe('usePipelineRunner - Properties 2 & 3: Status Management', () => {

    // Task 3.2
    test('Property 2: Status Reset Before Execution - Nodes are reset and then processed', async () => {
        await fc.assert(
            fc.asyncProperty(arbPipeline(), async (graph) => {
                // Skip empty pipelines
                fc.pre(graph.nodes.length > 0);

                const { setNodes, setEdges, getNodes, getEdges, resetNodes, resetEdges } = createMockSetters();
                const onNotify = createMockNotify();

                // Initialize with random statuses (generators already produce random statuses if not overridden)
                resetNodes(graph.nodes);
                resetEdges(graph.edges);

                const { result } = renderHook(() => usePipelineRunner({
                    nodes: getNodes(),
                    edges: getEdges(),
                    setNodes: setNodes as any,
                    setEdges: setEdges as any,
                    onNotify,
                    stepDelay: 100
                }));

                // Trigger pipeline run
                let promise: Promise<void>;
                act(() => {
                    promise = result.current.runPipeline();
                });

                // Check that nodes are either 'idle' (reset) or 'processing' (first node started)
                // But definitely NOT whatever they were before if they were 'success' or 'failed'.
                const currentNodes = getNodes();

                // At least one node should be 'processing' (the first one)
                // Others that haven't started yet should be 'idle'
                const validStatuses = currentNodes.every(n => n.data.status === 'idle' || n.data.status === 'processing');

                if (!validStatuses) {
                    throw new Error(`Invalid status found after reset: ${JSON.stringify(currentNodes.map(n => n.id + ':' + n.data.status))}`);
                }

                expect(validStatuses).toBe(true);

                // Cleanup
                await advanceUntilDone(promise!);
            }),
            createFCParams({ numRuns: 20 })
        );
    });

    // Task 3.3
    test('Property 3: Status Preservation on Stop', async () => {
        await fc.assert(
            fc.asyncProperty(arbPipeline(), async (graph) => {
                // We need a pipeline long enough to interrupt
                fc.pre(graph.nodes.length > 2);

                const { setNodes, setEdges, getNodes, getEdges, resetNodes, resetEdges } = createMockSetters();
                const onNotify = createMockNotify();

                resetNodes(graph.nodes.map(n => ({ ...n, data: { ...n.data, status: 'idle' } })));
                resetEdges(graph.edges.map(e => ({ ...e, data: { ...e.data, status: 'idle' } })));

                const { result } = renderHook(() => usePipelineRunner({
                    nodes: getNodes(),
                    edges: getEdges(),
                    setNodes: setNodes as any,
                    setEdges: setEdges as any,
                    onNotify,
                    stepDelay: 100
                }));

                // Start
                let promise: Promise<void>;
                act(() => {
                    promise = result.current.runPipeline();
                });

                // Advance time partially
                await act(async () => {
                    jest.advanceTimersByTime(150);
                });

                // Stop
                act(() => {
                    result.current.stopPipeline();
                });

                // Advance to let stop take effect
                await advanceUntilDone(promise!);

                const finalNodes = getNodes();
                const hasSuccess = finalNodes.some(n => n.data.status === 'success');
                const keepsIdle = finalNodes.some(n => n.data.status === 'idle');

                // If the pipeline ran at least one node, we should have success.
                // Since we waited 150ms and delay is 100ms, at least node 1 should be success.
                expect(hasSuccess).toBe(true);
                // Since graph > 2 nodes, Node 3 should still be idle.
                expect(keepsIdle).toBe(true);
            }),
            createFCParams({ numRuns: 20 })
        );
    });
});
