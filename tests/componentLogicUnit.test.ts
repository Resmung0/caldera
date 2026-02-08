/**
 * @jest-environment jsdom
 */
/**
 * Unit tests for Component Logic (status update callbacks) - Task 8
 * 
 * Feature: pipeline-runner-refactoring
 * Task: 8.1 Write unit tests for updateNodeStatus
 * Task: 8.2 Write unit tests for updateEdgeStatus
 */

import { renderHook, act } from '@testing-library/react';
import { usePipelineRunner, PipelineStatus } from '../src/webview/hooks/usePipelineRunner';
import { createMockSetters, createMockNotify } from './pipelineTestUtils';
import { Node, Edge } from 'reactflow';
import React from 'react';

describe('usePipelineRunner - Task 8: Component Logic', () => {

    test('updateNodeStatus updates only the target node status', () => {
        const { setNodes, setEdges, getNodes, getEdges, resetNodes } = createMockSetters();
        const initialNodes: Node[] = [
            { id: '1', data: { status: 'idle' as PipelineStatus }, position: { x: 0, y: 0 } },
            { id: '2', data: { status: 'idle' as PipelineStatus }, position: { x: 0, y: 0 } }
        ];
        resetNodes(initialNodes);

        const { result } = renderHook(() => usePipelineRunner({
            nodes: getNodes(),
            edges: getEdges(),
            setNodes: setNodes as any,
            setEdges: setEdges as any,
            onNotify: jest.fn()
        }));

        act(() => {
            result.current.updateNodeStatus('1', 'processing');
        });

        const updatedNodes = getNodes();
        expect(updatedNodes.find(n => n.id === '1')?.data.status).toBe('processing');
        expect(updatedNodes.find(n => n.id === '2')?.data.status).toBe('idle');
    });

    test('updateEdgeStatus updates only the target edge status', () => {
        const { setNodes, setEdges, getNodes, getEdges, resetEdges } = createMockSetters();
        const initialEdges: Edge[] = [
            { id: 'e1', source: '1', target: '2', data: { status: 'idle' as PipelineStatus } },
            { id: 'e2', source: '2', target: '3', data: { status: 'idle' as PipelineStatus } }
        ];
        resetEdges(initialEdges);

        const { result } = renderHook(() => usePipelineRunner({
            nodes: getNodes(),
            edges: getEdges(),
            setNodes: setNodes as any,
            setEdges: setEdges as any,
            onNotify: jest.fn()
        }));

        act(() => {
            result.current.updateEdgeStatus('e1', 'success');
        });

        const updatedEdges = getEdges();
        expect(updatedEdges.find(e => e.id === 'e1')?.data?.status).toBe('success');
        expect(updatedEdges.find(e => e.id === 'e2')?.data?.status).toBe('idle');
    });
});
