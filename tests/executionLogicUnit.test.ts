/**
 * @jest-environment jsdom
 */
/**
 * Unit tests for Execution Logic (processNodeStep) - Task 6.1
 * 
 * Feature: pipeline-runner-refactoring
 * Task: 6.1 Write unit tests for processNodeStep
 */

import { processNodeStep, PipelineStatus } from '../src/webview/hooks/usePipelineRunner';
import React from 'react';

// Mock timers for fast execution
jest.useFakeTimers();

describe('processNodeStep - Task 6.1: Node Execution Logic', () => {
    const mockUpdateNodeStatus = jest.fn();
    const mockUpdateEdgeStatus = jest.fn();
    const mockShouldStopRef = { current: false } as React.MutableRefObject<boolean>;
    const mockEdges = [
        { id: 'e1', source: '0', target: '1' },
        { id: 'e2', source: '2', target: '1' }
    ] as any[];

    beforeEach(() => {
        jest.clearAllMocks();
        mockShouldStopRef.current = false;
    });

    test('processNodeStep updates node to processing and waits', async () => {
        const promise = processNodeStep(
            '1',
            mockEdges,
            mockUpdateNodeStatus,
            mockUpdateEdgeStatus,
            1000,
            mockShouldStopRef
        );

        // Verification immediately after calling (before timer)
        expect(mockUpdateNodeStatus).toHaveBeenCalledWith('1', 'processing');
        // Incoming edges to '1' are e1, e2
        expect(mockUpdateEdgeStatus).toHaveBeenCalledWith('e1', 'processing');
        expect(mockUpdateEdgeStatus).toHaveBeenCalledWith('e2', 'processing');

        // Advance timer
        await jest.advanceTimersByTimeAsync(1000);
        await promise;

        // Verify success transition
        expect(mockUpdateNodeStatus).toHaveBeenCalledWith('1', 'success');
        expect(mockUpdateEdgeStatus).toHaveBeenCalledWith('e1', 'success');
        expect(mockUpdateEdgeStatus).toHaveBeenCalledWith('e2', 'success');
    });

    test('processNodeStep respects stop request', async () => {
        const promise = processNodeStep(
            '1',
            mockEdges,
            mockUpdateNodeStatus,
            mockUpdateEdgeStatus,
            1000,
            mockShouldStopRef
        );

        // Request stop while waiting
        mockShouldStopRef.current = true;

        // Advance timer
        await jest.advanceTimersByTimeAsync(1000);
        const result = await promise;

        expect(result.stopped).toBe(true);
        expect(mockUpdateNodeStatus).toHaveBeenCalledWith('1', 'idle');
        expect(mockUpdateEdgeStatus).toHaveBeenCalledWith('e1', 'idle');
    });

    test('processNodeStep handles no incoming edges', async () => {
        const promise = processNodeStep(
            '0', // Node 0 has no incoming edges
            mockEdges,
            mockUpdateNodeStatus,
            mockUpdateEdgeStatus,
            100,
            mockShouldStopRef
        );

        await jest.advanceTimersByTimeAsync(100);
        await promise;

        expect(mockUpdateNodeStatus).toHaveBeenCalledWith('0', 'processing');
        expect(mockUpdateEdgeStatus).not.toHaveBeenCalled();
    });
});
