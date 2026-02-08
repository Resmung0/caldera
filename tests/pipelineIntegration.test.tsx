/**
 * @jest-environment jsdom
 */
import React, { useState } from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { usePipelineRunner } from '../src/webview/hooks/usePipelineRunner';
import { PipelineNodeItem } from '../src/webview/components/PipelineNodeItem';
import { Node, Edge } from 'reactflow';

// Mock ReactFlow components
jest.mock('reactflow', () => ({
    Handle: () => <div />,
    Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' }
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, initial, animate, exit, transition, ...props }: any) => (
            <div
                {...props}
                data-animate={typeof animate === 'string' ? animate : JSON.stringify(animate)}
                data-initial={typeof initial === 'string' ? initial : JSON.stringify(initial)}
            >
                {children}
            </div>
        ),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const PipelineTester = ({ initialNodes, initialEdges, stepDelay = 50 }: any) => {
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>(initialEdges);
    const onNotify = jest.fn();

    const { runPipeline, stopPipeline, isRunning } = usePipelineRunner({
        nodes,
        edges,
        setNodes: setNodes as any,
        setEdges: setEdges as any,
        onNotify,
        stepDelay
    });

    return (
        <div>
            <div data-testid="is-running">{isRunning ? 'YES' : 'NO'}</div>
            <button data-testid="run-btn" onClick={() => runPipeline()}>Run</button>
            <button data-testid="stop-btn" onClick={() => stopPipeline()}>Stop</button>
            <div className="pipeline-nodes">
                {nodes.map(node => (
                    <PipelineNodeItem
                        key={node.id}
                        {...node}
                        type={node.type || 'custom'}
                        isConnectable={false}
                        xPos={node.position.x}
                        yPos={node.position.y}
                        dragging={false}
                        zIndex={0}
                        selected={false}
                    />
                ))}
            </div>
        </div>
    );
};

describe('Pipeline Integration - Task 11.1 & 11.2', () => {

    test('Task 11.1: Complete pipeline execution flow', async () => {
        const initialNodes: Node[] = [
            { id: 'n1', data: { label: 'Node 1', status: 'idle' }, position: { x: 0, y: 0 }, type: 'custom' },
            { id: 'n2', data: { label: 'Node 2', status: 'idle' }, position: { x: 0, y: 0 }, type: 'custom' },
        ];
        const initialEdges: Edge[] = [
            { id: 'e1', source: 'n1', target: 'n2', data: { status: 'idle' } }
        ];

        render(<PipelineTester initialNodes={initialNodes} initialEdges={initialEdges} stepDelay={10} />);

        expect(screen.getByTestId('is-running').textContent).toBe('NO');

        fireEvent.click(screen.getByTestId('run-btn'));

        // Check it's running
        expect(screen.getByTestId('is-running').textContent).toBe('YES');

        // Wait for first node to be processing
        await waitFor(() => {
            const node1 = screen.getByText('Node 1').closest('.pipeline-node-item');
            expect(node1?.classList.contains('processing')).toBe(true);
        }, { timeout: 1000 });

        // Wait for completion
        await waitFor(() => {
            expect(screen.getByTestId('is-running').textContent).toBe('NO');
        }, { timeout: 2000 });

        // Verify final states in DOM
        const node1 = screen.getByText('Node 1').closest('.pipeline-node-item');
        const node2 = screen.getByText('Node 2').closest('.pipeline-node-item');
        expect(node1?.classList.contains('success')).toBe(true);
        expect(node2?.classList.contains('success')).toBe(true);
    });

    test('Task 11.2: Empty pipeline', async () => {
        render(<PipelineTester initialNodes={[]} initialEdges={[]} />);
        fireEvent.click(screen.getByTestId('run-btn'));

        // Should finish immediately
        await waitFor(() => {
            expect(screen.getByTestId('is-running').textContent).toBe('NO');
        });
    });

    test('Task 11.2: Single node pipeline', async () => {
        const initialNodes: Node[] = [
            { id: 'n1', data: { label: 'Solo', status: 'idle' }, position: { x: 0, y: 0 }, type: 'custom' }
        ];
        render(<PipelineTester initialNodes={initialNodes} initialEdges={[]} stepDelay={10} />);

        fireEvent.click(screen.getByTestId('run-btn'));

        await waitFor(() => {
            const node = screen.getByText('Solo').closest('.pipeline-node-item');
            expect(node?.classList.contains('success')).toBe(true);
        });
    });

    test('Task 11.2: Disconnected components', async () => {
        const initialNodes: Node[] = [
            { id: 'a1', data: { label: 'A1', status: 'idle' }, position: { x: 0, y: 0 }, type: 'custom' },
            { id: 'b1', data: { label: 'B1', status: 'idle' }, position: { x: 0, y: 0 }, type: 'custom' }
        ];
        // No edges
        render(<PipelineTester initialNodes={initialNodes} initialEdges={[]} stepDelay={10} />);

        fireEvent.click(screen.getByTestId('run-btn'));

        await waitFor(() => {
            expect(screen.getByText('A1').closest('.pipeline-node-item')?.classList.contains('success')).toBe(true);
            expect(screen.getByText('B1').closest('.pipeline-node-item')?.classList.contains('success')).toBe(true);
        });
    });

    test('Task 11.2: stepDelay = 0', async () => {
        const initialNodes: Node[] = [
            { id: 'n1', data: { label: 'Fast', status: 'idle' }, position: { x: 0, y: 0 }, type: 'custom' }
        ];
        render(<PipelineTester initialNodes={initialNodes} initialEdges={[]} stepDelay={0} />);

        fireEvent.click(screen.getByTestId('run-btn'));

        await waitFor(() => {
            expect(screen.getByText('Fast').closest('.pipeline-node-item')?.classList.contains('success')).toBe(true);
        });
    });

    test('Task 11.2: Stop immediately after start', async () => {
        const initialNodes: Node[] = [
            { id: 'n1', data: { label: 'StopMe', status: 'idle' }, position: { x: 0, y: 0 }, type: 'custom' }
        ];
        render(<PipelineTester initialNodes={initialNodes} initialEdges={[]} stepDelay={100} />);

        fireEvent.click(screen.getByTestId('run-btn'));
        expect(screen.getByTestId('is-running').textContent).toBe('YES');

        fireEvent.click(screen.getByTestId('stop-btn'));

        await waitFor(() => {
            expect(screen.getByTestId('is-running').textContent).toBe('NO');
        });

        const node = screen.getByText('StopMe').closest('.pipeline-node-item');
        // It might be processing if it started, or idle if it didn't even start.
        // In our implementation, processNodeStep is called in runPipeline.
        expect(node?.classList.contains('success')).toBe(false);
    });

    test('Task 11.1: Interaction - Dropdown toggles', async () => {
        const initialNodes: Node[] = [
            {
                id: 'n1',
                data: {
                    label: 'Params Node',
                    status: 'idle',
                    params: { lr: 0.01, epochs: 10 }
                },
                position: { x: 0, y: 0 },
                type: 'custom'
            },
        ];
        render(<PipelineTester initialNodes={initialNodes} initialEdges={[]} />);

        // Find the params badge/label
        const paramsBadge = screen.getByText('Params');
        fireEvent.click(paramsBadge);

        // Check if dropdown expanded
        expect(screen.queryByText('lr:')).not.toBeNull();
        expect(screen.queryByText('0.01')).not.toBeNull();

        // Toggle again
        fireEvent.click(paramsBadge);
        expect(screen.queryByText('lr:')).toBeNull();
    });

    test('Task 11.1: Selection mode behavior', () => {
        const initialNodes: Node[] = [
            { id: 'n1', data: { label: 'Node 1', status: 'idle', isSelectionMode: true, isSelected: true }, position: { x: 0, y: 0 }, type: 'custom' },
            { id: 'n2', data: { label: 'Node 2', status: 'idle', isSelectionMode: true, isSelected: false }, position: { x: 0, y: 0 }, type: 'custom' },
        ];
        render(<PipelineTester initialNodes={initialNodes} initialEdges={[]} />);

        const node1 = screen.getByText('Node 1').closest('.pipeline-node-item');
        const node2 = screen.getByText('Node 2').closest('.pipeline-node-item');

        expect(node1?.classList.contains('selected')).toBe(true);
        expect(node2?.classList.contains('selected')).toBe(false);
    });

    test('Task 11.2: Nodes with empty params or very long labels', () => {
        const initialNodes: Node[] = [
            { id: 'n1', data: { label: 'A very very very very very very long label that should be truncated', status: 'idle', params: {} }, position: { x: 0, y: 0 }, type: 'custom' }
        ];
        render(<PipelineTester initialNodes={initialNodes} initialEdges={[]} />);

        expect(screen.queryByText(/A very/)).not.toBeNull();
        // With empty params, the badge should NOT be rendered
        expect(screen.queryByText('Params')).toBeNull();
    });

    test('Task 11.3: Visual Validation - Sweep overlay during processing', async () => {
        const initialNodes: Node[] = [
            { id: 'n1', data: { label: 'Node 1', status: 'idle' }, position: { x: 0, y: 0 }, type: 'custom' }
        ];
        render(<PipelineTester initialNodes={initialNodes} initialEdges={[]} stepDelay={100} />);

        fireEvent.click(screen.getByTestId('run-btn'));

        await waitFor(() => {
            const sweep = document.querySelector('.sweep-overlay');
            expect(sweep).not.toBeNull();
        });
    });

    test('Task 11.3: Visual Validation - Animation variants for success/failure', async () => {
        const initialNodes: Node[] = [
            { id: 'n1', data: { label: 'N1', status: 'success' }, position: { x: 0, y: 0 }, type: 'custom' },
            { id: 'n2', data: { label: 'N2', status: 'failed' }, position: { x: 0, y: 0 }, type: 'custom' }
        ];
        render(<PipelineTester initialNodes={initialNodes} initialEdges={[]} />);

        // Success node should have success animation variant
        const node1 = screen.getByText('N1').closest('.pipeline-node-item');
        expect(node1?.getAttribute('data-animate')).toBe('success');

        const node2 = screen.getByText('N2').closest('.pipeline-node-item');
        expect(node2?.getAttribute('data-animate')).toBe('failed');
    });

    test('Task 11.3: Visual Validation - Artifact ripple on success', () => {
        const initialNodes: Node[] = [
            { id: 'a1', data: { label: 'Artifact', status: 'success', type: 'artifact' }, position: { x: 0, y: 0 }, type: 'custom' }
        ];
        render(<PipelineTester initialNodes={initialNodes} initialEdges={[]} />);

        expect(document.querySelector('.materialize-ripple')).not.toBeNull();
    });

    test('Task 11.2: Rapid start/stop cycles', async () => {
        const initialNodes: Node[] = [
            { id: 'n1', data: { label: 'Rapid', status: 'idle' }, position: { x: 0, y: 0 }, type: 'custom' }
        ];
        render(<PipelineTester initialNodes={initialNodes} initialEdges={[]} stepDelay={100} />);

        fireEvent.click(screen.getByTestId('run-btn'));
        fireEvent.click(screen.getByTestId('stop-btn'));
        fireEvent.click(screen.getByTestId('run-btn'));
        fireEvent.click(screen.getByTestId('stop-btn'));

        await waitFor(() => {
            expect(screen.getByTestId('is-running').textContent).toBe('NO');
        });
    });
});
