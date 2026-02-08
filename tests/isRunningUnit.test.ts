/**
 * @jest-environment jsdom
 */
/**
 * Unit tests for isRunning state transitions - Task 2.3
 * 
 * Feature: pipeline-runner-refactoring
 * Task: 2.3 Write unit tests for isRunning state transitions
 */

import { renderHook, act } from '@testing-library/react';
import { usePipelineRunner } from '../src/webview/hooks/usePipelineRunner';
import { PipelineStatus } from '../src/webview/hooks/usePipelineRunner';

// Mock timers for fast execution
jest.useFakeTimers();
jest.setTimeout(30000);

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

describe('usePipelineRunner - Task 2.3: isRunning state transitions', () => {
    const mockNodes = [
        { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1', status: 'idle' as PipelineStatus } }
    ];
    const mockEdges: any[] = [];
    const mockSetNodes = jest.fn();
    const mockSetEdges = jest.fn();
    const mockOnNotify = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('isRunning is false initially', () => {
        const { result } = renderHook(() => usePipelineRunner({
            nodes: [],
            edges: [],
            setNodes: mockSetNodes,
            setEdges: mockSetEdges,
            onNotify: mockOnNotify
        }));

        expect(result.current.isRunning).toBe(false);
    });

    test('isRunning becomes true when pipeline starts and false when it completes', async () => {
        const { result } = renderHook(() => usePipelineRunner({
            nodes: mockNodes,
            edges: mockEdges,
            setNodes: mockSetNodes,
            setEdges: mockSetEdges,
            onNotify: mockOnNotify,
            stepDelay: 100
        }));

        let promise: Promise<void>;
        act(() => {
            promise = result.current.runPipeline();
        });

        // It should be true after starting
        expect(result.current.isRunning).toBe(true);

        // Advance timers to complete
        await advanceUntilDone(promise!);

        expect(result.current.isRunning).toBe(false);
    });

    test('isRunning becomes false when pipeline is stopped', async () => {
        const { result } = renderHook(() => usePipelineRunner({
            nodes: mockNodes,
            edges: mockEdges,
            setNodes: mockSetNodes,
            setEdges: mockSetEdges,
            onNotify: mockOnNotify,
            stepDelay: 100
        }));

        let promise: Promise<void>;
        act(() => {
            promise = result.current.runPipeline();
        });

        expect(result.current.isRunning).toBe(true);

        act(() => {
            result.current.stopPipeline();
        });

        // Advance timers to trigger the stop check
        await advanceUntilDone(promise!);

        expect(result.current.isRunning).toBe(false);
    });

    test('isRunning prevents concurrent runs', async () => {
        const { result } = renderHook(() => usePipelineRunner({
            nodes: mockNodes,
            edges: mockEdges,
            setNodes: mockSetNodes,
            setEdges: mockSetEdges,
            onNotify: mockOnNotify,
            stepDelay: 100
        }));

        let promise1: Promise<void>;
        act(() => {
            promise1 = result.current.runPipeline();
        });

        expect(result.current.isRunning).toBe(true);

        // Try to run again
        act(() => {
            result.current.runPipeline();
        });

        // Should only have one "Pipeline started" notification
        expect(mockOnNotify).toHaveBeenCalledWith('info', 'Pipeline started');
        expect(mockOnNotify).toHaveBeenCalledTimes(1);

        // Complete the first run
        await advanceUntilDone(promise1!);

        expect(result.current.isRunning).toBe(false);
    });
});
