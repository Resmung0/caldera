/**
 * @jest-environment jsdom
 */
import * as fc from 'fast-check';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { PipelineNodeItem } from '../src/webview/components/PipelineNodeItem';
import { NodeProps } from 'reactflow';
// import '@testing-library/jest-dom';

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

// Mock NodeDropdown
jest.mock('../src/webview/components/NodeDropdown', () => ({
    NodeDropdown: ({ label }: any) => <div data-testid={`dropdown-${label}`}>{label}</div>
}));

describe('PipelineNodeItem - Task 9.3: Sweep Overlay Property Tests', () => {
    const statusArb = fc.constantFrom('idle', 'processing', 'running', 'success', 'failed', undefined);
    const typeArb = fc.constantFrom('stage', 'artifact', undefined);

    const nodeDataArb = fc.record({
        label: fc.string(),
        status: statusArb,
        type: typeArb,
        framework: fc.option(fc.string(), { nil: undefined }),
    });

    afterEach(() => {
        cleanup();
    });

    test('Property 8: Sweep Overlay Display - Shown only for processing or running', () => {
        fc.assert(
            fc.property(nodeDataArb, (data) => {
                const props: NodeProps = {
                    id: 'test-node',
                    data: { ...data },
                    selected: false,
                } as any;

                const { container } = render(<PipelineNodeItem {...props} />);

                const sweepOverlay = container.querySelector('.sweep-overlay');
                const isProcessingOrRunning = data.status === 'processing' || data.status === 'running';

                // Note: Artifact nodes currently don't use the same sweep overlay div in the code,
                // it seems from looking at the Source, artifact nodes don't have the sweep-overlay code block.
                // Let's verify that in the code.

                const isArtifact = data.type === 'artifact';

                if (isArtifact) {
                    // Artifact nodes in PipelineNodeItem.tsx (lines 149-303) don't have sweep-overlay logic
                    expect(sweepOverlay).toBeNull();
                } else {
                    if (isProcessingOrRunning) {
                        expect(sweepOverlay).not.toBeNull();
                    } else {
                        expect(sweepOverlay).toBeNull();
                    }
                }

                cleanup();
            }),
            { numRuns: 100 }
        );
    });
});
