/**
 * @jest-environment jsdom
 */
/**
 * Unit tests for Status Reset and Preservation - Task 3.4
 * 
 * Feature: pipeline-runner-refactoring
 * Task: 3.4 Write unit tests for status reset behavior
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
 * Necessary for sequential async operations with fake timers in React.
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

describe('usePipelineRunner - Task 3.4: Status Reset Behavior', () => {

    test('Nodes are reset to idle immediately upon runPipeline call', async () => {
        const { setNodes, setEdges, getNodes, getEdges, resetNodes, resetEdges } = createMockSetters();
        const onNotify = createMockNotify();

        const initialNodes: Node[] = [
            { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1', status: 'success' as PipelineStatus } },
            { id: '2', position: { x: 0, y: 0 }, data: { label: 'Node 2', status: 'failed' as PipelineStatus } }
        ];

        resetNodes(initialNodes);

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

        // Immediately check statuses
        const currentNodes = getNodes();
        const node1 = currentNodes.find(n => n.id === '1');
        const node2 = currentNodes.find(n => n.id === '2');

        expect(node1?.data.status).toBe('processing');
        expect(node2?.data.status).toBe('idle');

        // Cleanup
        await advanceUntilDone(promise!);
    });

    test('Edges are reset to idle immediately upon runPipeline call', async () => {
        const { setNodes, setEdges, getNodes, getEdges, resetNodes, resetEdges } = createMockSetters();
        const onNotify = createMockNotify();

        const initialEdges: Edge[] = [
            { id: 'e1', source: '1', target: '2', data: { status: 'success' as PipelineStatus } },
            { id: 'e2', source: '2', target: '3', data: { status: 'processing' as PipelineStatus } }
        ];

        resetEdges(initialEdges);
        resetNodes([
            { id: '1', data: { label: 'N1' } },
            { id: '2', data: { label: 'N2' } },
            { id: '3', data: { label: 'N3' } }
        ] as Node[]);

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

        const currentEdges = getEdges();
        expect(currentEdges[0].data?.status).toBe('idle');
        expect(currentEdges[1].data?.status).toBe('idle');

        // Cleanup
        await advanceUntilDone(promise!);
    });

    test('Stop preserves success status of already completed nodes', async () => {
        const { setNodes, setEdges, getNodes, getEdges, resetNodes, resetEdges } = createMockSetters();
        const onNotify = createMockNotify();

        const initialNodes: Node[] = [
            { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1', status: 'idle' as PipelineStatus } },
            { id: '2', position: { x: 0, y: 0 }, data: { label: 'Node 2', status: 'idle' as PipelineStatus } }
        ];
        const initialEdges: Edge[] = [
            { id: 'e1', source: '1', target: '2', data: { status: 'idle' as PipelineStatus } }
        ];

        resetNodes(initialNodes);
        resetEdges(initialEdges);

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

        // Let Node 1 finish
        await act(async () => {
            jest.advanceTimersByTime(150);
        });

        expect(getNodes().find(n => n.id === '1')?.data.status).toBe('success');

        // Stop
        act(() => {
            result.current.stopPipeline();
        });

        // Cleanup
        await advanceUntilDone(promise!);

        const finalNodes = getNodes();
        expect(finalNodes.find(n => n.id === '1')?.data.status).toBe('success');
        expect(finalNodes.find(n => n.id === '2')?.data.status).toBe('idle');
    });
});
