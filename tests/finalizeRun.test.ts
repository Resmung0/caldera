/**
 * Unit tests for finalizeRun helper function - Task 7.1
 * 
 * These tests verify that the finalizeRun function correctly sends
 * notifications based on the pipeline execution outcome.
 * 
 * Feature: pipeline-runner-refactoring
 * Task: 7.1 Create finalizeRun function
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { Node } from 'reactflow';
import { finalizeRun } from '../src/webview/hooks/usePipelineRunner';

describe('finalizeRun - Task 7.1', () => {
    let mockOnNotify: jest.Mock;
    let nodes: Node[];

    beforeEach(() => {
        mockOnNotify = jest.fn();
        nodes = [
            { id: 'node-1', data: { label: 'Node 1' }, position: { x: 0, y: 0 } },
            { id: 'node-2', data: { label: 'Node 2' }, position: { x: 100, y: 0 } },
            { id: 'node-3', data: { label: 'Node 3' }, position: { x: 200, y: 0 } },
        ];
    });

    describe('stopped pipeline', () => {
        it('sends warning notification when pipeline is stopped', () => {
            finalizeRun(true, false, null, nodes, mockOnNotify);

            expect(mockOnNotify).toHaveBeenCalledTimes(1);
            expect(mockOnNotify).toHaveBeenCalledWith('warning', 'Pipeline stopped');
        });

        it('prioritizes stopped notification over failed notification', () => {
            // Even if failed is true, stopped takes precedence
            finalizeRun(true, true, 'node-2', nodes, mockOnNotify);

            expect(mockOnNotify).toHaveBeenCalledTimes(1);
            expect(mockOnNotify).toHaveBeenCalledWith('warning', 'Pipeline stopped');
        });
    });

    describe('failed pipeline', () => {
        it('sends error notification with node label when pipeline fails', () => {
            finalizeRun(false, true, 'node-2', nodes, mockOnNotify);

            expect(mockOnNotify).toHaveBeenCalledTimes(1);
            expect(mockOnNotify).toHaveBeenCalledWith('error', 'Pipeline failed at node: Node 2');
        });

        it('uses node ID when node label is not available', () => {
            const nodesWithoutLabel = [
                { id: 'node-1', data: {}, position: { x: 0, y: 0 } },
            ];

            finalizeRun(false, true, 'node-1', nodesWithoutLabel, mockOnNotify);

            expect(mockOnNotify).toHaveBeenCalledTimes(1);
            expect(mockOnNotify).toHaveBeenCalledWith('error', 'Pipeline failed at node: node-1');
        });

        it('uses node ID when failed node is not found in nodes array', () => {
            finalizeRun(false, true, 'non-existent-node', nodes, mockOnNotify);

            expect(mockOnNotify).toHaveBeenCalledTimes(1);
            expect(mockOnNotify).toHaveBeenCalledWith('error', 'Pipeline failed at node: non-existent-node');
        });

        it('does not send notification if failed is true but failedNodeId is null', () => {
            finalizeRun(false, true, null, nodes, mockOnNotify);

            // Should fall through to success case since failedNodeId is null
            expect(mockOnNotify).toHaveBeenCalledTimes(1);
            expect(mockOnNotify).toHaveBeenCalledWith('info', 'Pipeline completed successfully');
        });
    });

    describe('successful pipeline', () => {
        it('sends success notification when pipeline completes successfully', () => {
            finalizeRun(false, false, null, nodes, mockOnNotify);

            expect(mockOnNotify).toHaveBeenCalledTimes(1);
            expect(mockOnNotify).toHaveBeenCalledWith('info', 'Pipeline completed successfully');
        });

        it('sends success notification with empty nodes array', () => {
            finalizeRun(false, false, null, [], mockOnNotify);

            expect(mockOnNotify).toHaveBeenCalledTimes(1);
            expect(mockOnNotify).toHaveBeenCalledWith('info', 'Pipeline completed successfully');
        });
    });

    describe('edge cases', () => {
        it('handles nodes with undefined data', () => {
            const nodesWithUndefinedData = [
                { id: 'node-1', position: { x: 0, y: 0 } } as Node,
            ];

            finalizeRun(false, true, 'node-1', nodesWithUndefinedData, mockOnNotify);

            expect(mockOnNotify).toHaveBeenCalledTimes(1);
            expect(mockOnNotify).toHaveBeenCalledWith('error', 'Pipeline failed at node: node-1');
        });

        it('handles nodes with null label', () => {
            const nodesWithNullLabel = [
                { id: 'node-1', data: { label: null }, position: { x: 0, y: 0 } },
            ];

            finalizeRun(false, true, 'node-1', nodesWithNullLabel, mockOnNotify);

            expect(mockOnNotify).toHaveBeenCalledTimes(1);
            expect(mockOnNotify).toHaveBeenCalledWith('error', 'Pipeline failed at node: node-1');
        });

        it('handles nodes with empty string label', () => {
            const nodesWithEmptyLabel = [
                { id: 'node-1', data: { label: '' }, position: { x: 0, y: 0 } },
            ];

            finalizeRun(false, true, 'node-1', nodesWithEmptyLabel, mockOnNotify);

            expect(mockOnNotify).toHaveBeenCalledTimes(1);
            expect(mockOnNotify).toHaveBeenCalledWith('error', 'Pipeline failed at node: node-1');
        });
    });
});
