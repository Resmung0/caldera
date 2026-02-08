/**
 * @jest-environment jsdom
 */
/**
 * Unit tests for Notification Logic (finalizeRun) - Task 10.1
 * 
 * Feature: pipeline-runner-refactoring
 * Task: 10.1 Write unit tests for finalizeRun
 */

import { finalizeRun } from '../src/webview/hooks/usePipelineRunner';

describe('finalizeRun - Task 10.1: Notification Logic', () => {
    const mockOnNotify = jest.fn();
    const mockNodes = [
        { id: '1', data: { label: 'Node 1' } },
        { id: '2', data: { label: 'Node 2' } }
    ] as any[];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('finalizeRun sends warning when stopped', () => {
        finalizeRun(true, false, null, mockNodes, mockOnNotify);
        expect(mockOnNotify).toHaveBeenCalledWith('warning', 'Pipeline stopped');
    });

    test('finalizeRun sends error with node label when failed', () => {
        finalizeRun(false, true, '2', mockNodes, mockOnNotify);
        expect(mockOnNotify).toHaveBeenCalledWith('error', 'Pipeline failed at node: Node 2');
    });

    test('finalizeRun sends success info when completed normally', () => {
        finalizeRun(false, false, null, mockNodes, mockOnNotify);
        expect(mockOnNotify).toHaveBeenCalledWith('info', 'Pipeline completed successfully');
    });

    test('finalizeRun handles missing node label by using ID', () => {
        finalizeRun(false, true, '3', mockNodes, mockOnNotify);
        expect(mockOnNotify).toHaveBeenCalledWith('error', 'Pipeline failed at node: 3');
    });
});
