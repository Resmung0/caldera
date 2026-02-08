/**
 * @jest-environment jsdom
 */
/**
 * Property-based tests for usePipelineRunner isRunning state - Task 2.2
 * 
 * Feature: pipeline-runner-refactoring
 * Property 1: Running State Reactivity
 */

import * as fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { usePipelineRunner } from '../src/webview/hooks/usePipelineRunner';
import { arbPipeline, createMockNotify, createFCParams } from './pipelineTestUtils';

// Mock timers for fast execution
jest.useFakeTimers();
jest.setTimeout(60000);

/**
 * Helper to advance fake timers until a promise resolves.
 * This is necessary because runPipeline has multiple sequential awaits on timers.
 */
async function advanceUntilDone(promise: Promise<void>) {
    let done = false;
    promise.finally(() => { done = true; });

    // Safety counter to prevent infinite loops
    let iterations = 0;
    while (!done && iterations < 100) {
        iterations++;
        await act(async () => {
            jest.runAllTimers();
            // Allow microtasks to run (important for promise chaining)
            await Promise.resolve();
        });
    }
}

describe('usePipelineRunner - Property 1: Running State Reactivity', () => {
    test('isRunning property: transitions correctly during pipeline execution', async () => {
        await fc.assert(
            fc.asyncProperty(arbPipeline(), async (graph) => {
                // Skip empty pipelines because they finish so fast isRunning might already be false after act()
                fc.pre(graph.nodes.length > 0);

                const setNodes = jest.fn();
                const setEdges = jest.fn();
                const onNotify = createMockNotify();

                const { result } = renderHook(() => usePipelineRunner({
                    nodes: graph.nodes as any,
                    edges: graph.edges as any,
                    setNodes,
                    setEdges,
                    onNotify,
                    stepDelay: 0
                }));

                // Initially not running
                expect(result.current.isRunning).toBe(false);

                // Start pipeline
                let promise: Promise<void>;
                act(() => {
                    promise = result.current.runPipeline();
                });

                // Should be running immediately
                expect(result.current.isRunning).toBe(true);

                // Advance all timers to completion in a loop
                await advanceUntilDone(promise!);

                // Should be finished
                expect(result.current.isRunning).toBe(false);
            }),
            createFCParams({ numRuns: 20 })
        );
    });

    test('isRunning property: transitions correctly when stopped', async () => {
        await fc.assert(
            fc.asyncProperty(arbPipeline(), async (graph) => {
                // Only pipelines with nodes can be stopped mid-way reliably in this test
                fc.pre(graph.nodes.length > 0);

                const setNodes = jest.fn();
                const setEdges = jest.fn();
                const onNotify = createMockNotify();

                const { result } = renderHook(() => usePipelineRunner({
                    nodes: graph.nodes as any,
                    edges: graph.edges as any,
                    setNodes,
                    setEdges,
                    onNotify,
                    stepDelay: 100
                }));

                // Start pipeline
                let promise: Promise<void>;
                act(() => {
                    promise = result.current.runPipeline();
                });

                expect(result.current.isRunning).toBe(true);

                // Stop pipeline
                act(() => {
                    result.current.stopPipeline();
                });

                // Advance timers until the stop logic propagates
                await advanceUntilDone(promise!);

                // Should be finished
                expect(result.current.isRunning).toBe(false);
            }),
            createFCParams({ numRuns: 20 })
        );
    });
});
