/**
 * @jest-environment jsdom
 */
/**
 * Integration tests for full pipeline execution - Task 11
 * 
 * Feature: pipeline-runner-refactoring
 * Task: 11.1 Full pipeline run integration
 * Task: 11.2 Pipeline stop integration
 */

import { renderHook, act } from '@testing-library/react';
import { usePipelineRunner, PipelineStatus } from '../src/webview/hooks/usePipelineRunner';
import { createMockSetters, createMockNotify } from './pipelineTestUtils';
import { Node, Edge } from 'reactflow';
import React from 'react';

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

describe('usePipelineRunner - Task 11: Integration Tests', () => {

    test('11.1: Full pipeline run (A -> B) results in all success and notification', async () => {
        const { setNodes, setEdges, getNodes, getEdges, resetNodes, resetEdges } = createMockSetters();
        const onNotify = createMockNotify();

        const nodes: Node[] = [
            { id: 'A', position: { x: 0, y: 0 }, data: { label: 'Node A', status: 'idle' as PipelineStatus } },
            { id: 'B', position: { x: 0, y: 0 }, data: { label: 'Node B', status: 'idle' as PipelineStatus } }
        ];
        const edges: Edge[] = [
            { id: 'e1', source: 'A', target: 'B', data: { status: 'idle' as PipelineStatus } }
        ];

        resetNodes(nodes);
        resetEdges(edges);

        const { result } = renderHook(() => usePipelineRunner({
            nodes: getNodes(),
            edges: getEdges(),
            setNodes: setNodes as any,
            setEdges: setEdges as any,
            onNotify,
            stepDelay: 100
        }));

        let promise: Promise<void>;
        act(() => {
            promise = result.current.runPipeline();
        });

        expect(result.current.isRunning).toBe(true);
        expect(onNotify).toHaveBeenCalledWith('info', 'Pipeline started');

        // Complete the run
        await advanceUntilDone(promise!);

        expect(result.current.isRunning).toBe(false);
        const finalNodes = getNodes();
        const finalEdges = getEdges();

        expect(finalNodes.find(n => n.id === 'A')?.data.status).toBe('success');
        expect(finalNodes.find(n => n.id === 'B')?.data?.status).toBe('success');
        expect(finalEdges.find(e => e.id === 'e1')?.data?.status).toBe('success');
        expect(onNotify).toHaveBeenCalledWith('info', 'Pipeline completed successfully');
    });

    test('11.2: Pipeline stop prevents further execution and keeps intermediate states', async () => {
        const { setNodes, setEdges, getNodes, getEdges, resetNodes, resetEdges } = createMockSetters();
        const onNotify = createMockNotify();

        const nodes: Node[] = [
            { id: '1', position: { x: 0, y: 0 }, data: { label: 'N1', status: 'idle' } },
            { id: '2', position: { x: 0, y: 0 }, data: { label: 'N2', status: 'idle' } },
            { id: '3', position: { x: 0, y: 0 }, data: { label: 'N3', status: 'idle' } }
        ];
        // 1 -> 2 -> 3
        const edges: Edge[] = [
            { id: 'e1', source: '1', target: '2', data: { status: 'idle' } },
            { id: 'e2', source: '2', target: '3', data: { status: 'idle' } }
        ];

        resetNodes(nodes as any);
        resetEdges(edges as any);

        const { result } = renderHook(() => usePipelineRunner({
            nodes: getNodes(),
            edges: getEdges(),
            setNodes: setNodes as any,
            setEdges: setEdges as any,
            onNotify,
            stepDelay: 100
        }));

        let promise: Promise<void>;
        act(() => {
            promise = result.current.runPipeline();
        });

        // Let N1 finish
        await act(async () => {
            jest.advanceTimersByTime(150);
        });

        expect(getNodes().find(n => n.id === '1')?.data.status).toBe('success');

        // Stop while N2 might be starting or waiting
        act(() => {
            result.current.stopPipeline();
        });

        await advanceUntilDone(promise!);

        expect(result.current.isRunning).toBe(false);
        expect(onNotify).toHaveBeenCalledWith('warning', 'Pipeline stopped');

        const finalNodes = getNodes();
        expect(finalNodes.find(n => n.id === '1')?.data.status).toBe('success');
        // Node 2 should NOT be success (it was interrupted or never reached success)
        expect(finalNodes.find(n => n.id === '2')?.data.status).not.toBe('success');
        expect(finalNodes.find(n => n.id === '3')?.data.status).toBe('idle');
    });
});
