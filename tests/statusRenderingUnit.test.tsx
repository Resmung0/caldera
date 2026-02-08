/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PipelineNodeItem } from '../src/webview/components/PipelineNodeItem';
import { NodeProps } from 'reactflow';
// import '@testing-library/jest-dom'; // Disabled since not in package.json

// Mock ReactFlow handles and Position
jest.mock('reactflow', () => ({
    Handle: ({ type, position, className }: any) => (
        <div data-testid={`handle-${type}-${position}`} className={className} />
    ),
    Position: {
        Left: 'left',
        Top: 'top',
        Right: 'right',
        Bottom: 'bottom'
    }
}));

// Mock NodeDropdown to avoid rendering its complexity
jest.mock('../src/webview/components/NodeDropdown', () => ({
    NodeDropdown: ({ label }: any) => <div data-testid={`dropdown-${label}`}>{label}</div>
}));

describe('PipelineNodeItem - Task 9.4: Status Rendering Unit Tests', () => {
    const defaultProps: NodeProps = {
        id: 'node-1',
        data: {
            label: 'Test Node',
            status: 'idle',
            framework: 'GitHub Actions',
            type: 'stage'
        },
        selected: false,
        zIndex: 0,
        isConnectable: true,
        xPos: 0,
        yPos: 0,
        dragging: false,
        dragHandle: '',
        type: 'custom'
    } as any;

    const statuses = ['idle', 'processing', 'running', 'success', 'failed'] as const;

    test.each(statuses)('renders correctly for status: %s', (status) => {
        const props = {
            ...defaultProps,
            data: { ...defaultProps.data, status }
        };

        const { container } = render(<PipelineNodeItem {...props} />);

        // Verify status text
        const statusText = screen.queryByText(new RegExp(status, 'i'));
        expect(statusText).not.toBeNull();

        // Verify className
        const nodeElement = container.firstChild as HTMLElement;
        if (status === 'processing' || status === 'running') {
            expect(nodeElement.classList.contains('processing')).toBe(true);
        } else if (status === 'success') {
            expect(nodeElement.classList.contains('success')).toBe(true);
        } else if (status === 'failed') {
            expect(nodeElement.classList.contains('failed')).toBe(true);
        } else {
            expect(nodeElement.classList.contains('processing')).toBe(false);
            expect(nodeElement.classList.contains('success')).toBe(false);
            expect(nodeElement.classList.contains('failed')).toBe(false);
        }

        // Verify sweep overlay
        const sweepOverlay = container.querySelector('.sweep-overlay');
        if (status === 'processing' || status === 'running') {
            expect(sweepOverlay).not.toBeNull();
        } else {
            expect(sweepOverlay).toBeNull();
        }
    });

    test('renders artifact node correctly', () => {
        const props = {
            ...defaultProps,
            data: {
                ...defaultProps.data,
                type: 'artifact',
                status: 'success',
                dataType: 'image'
            }
        };

        const { container } = render(<PipelineNodeItem {...props} />);

        const nodeElement = container.firstChild as HTMLElement;
        expect(nodeElement.classList.contains('artifact')).toBe(true);
        expect(screen.queryByText('Materialized')).not.toBeNull();
        expect(screen.queryByText('image')).not.toBeNull();
    });
});
