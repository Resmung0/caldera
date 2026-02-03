import { useCallback, useRef } from 'react';
import { Node, Edge } from 'reactflow';

export type PipelineStatus = 'idle' | 'processing' | 'success' | 'failed';

interface PipelineRunnerOptions {
    nodes: Node[];
    edges: Edge[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
    onNotify: (type: 'info' | 'error' | 'warning', message: string) => void;
    stepDelay?: number; // Delay between steps in ms
}

interface PipelineRunnerResult {
    runPipeline: () => Promise<void>;
    stopPipeline: () => void;
    isRunning: boolean;
    updateNodeStatus: (nodeId: string, status: PipelineStatus) => void;
    updateEdgeStatus: (edgeId: string, status: PipelineStatus) => void;
}

/**
 * Hook to orchestrate pipeline animation states.
 * 
 * This hook provides utilities to:
 * - Run through nodes/edges sequentially, updating their status
 * - Send notifications on completion or failure
 * - Stop the pipeline mid-execution
 */
export function usePipelineRunner({
    nodes,
    edges,
    setNodes,
    setEdges,
    onNotify,
    stepDelay = 1500,
}: PipelineRunnerOptions): PipelineRunnerResult {
    const isRunningRef = useRef(false);
    const shouldStopRef = useRef(false);

    const updateNodeStatus = useCallback((nodeId: string, status: PipelineStatus) => {
        setNodes((nds) =>
            nds.map((n) =>
                n.id === nodeId ? { ...n, data: { ...n.data, status } } : n
            )
        );
    }, [setNodes]);

    const updateEdgeStatus = useCallback((edgeId: string, status: PipelineStatus) => {
        setEdges((eds) =>
            eds.map((e) =>
                e.id === edgeId ? { ...e, data: { ...e.data, status } } : e
            )
        );
    }, [setEdges]);

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const runPipeline = useCallback(async () => {
        if (isRunningRef.current) return;

        isRunningRef.current = true;
        shouldStopRef.current = false;

        // Build execution order from edges (topological sort approximation)
        // For simplicity, we'll use node order and follow edges
        const nodeIds = nodes.map((n) => n.id);
        const edgeMap = new Map<string, string[]>(); // source -> [edges to that node]

        edges.forEach((e) => {
            const edgeId = e.id;
            if (!edgeMap.has(e.source)) {
                edgeMap.set(e.source, []);
            }
            edgeMap.get(e.source)!.push(edgeId);
        });

        // Find root nodes (no incoming edges)
        const hasIncoming = new Set(edges.map((e) => e.target));
        const rootNodes = nodeIds.filter((id) => !hasIncoming.has(id));

        // Simple BFS traversal
        const visited = new Set<string>();
        const queue = [...rootNodes];
        let failed = false;
        let failedNodeId: string | null = null;

        onNotify('info', 'Pipeline started');

        while (queue.length > 0 && !shouldStopRef.current) {
            const nodeId = queue.shift()!;
            if (visited.has(nodeId)) continue;
            visited.add(nodeId);

            // Start processing node
            updateNodeStatus(nodeId, 'processing');

            // Animate incoming edges
            const incomingEdges = edges.filter((e) => e.target === nodeId);
            incomingEdges.forEach((e) => updateEdgeStatus(e.id, 'processing'));

            await delay(stepDelay);

            if (shouldStopRef.current) {
                updateNodeStatus(nodeId, 'idle');
                incomingEdges.forEach((e) => updateEdgeStatus(e.id, 'idle'));
                break;
            }

            // Simulate success/failure (you can replace this with real logic)
            // For demo, all nodes succeed
            const nodeSucceeded = true; // Replace with actual execution result

            if (nodeSucceeded) {
                updateNodeStatus(nodeId, 'success');
                incomingEdges.forEach((e) => updateEdgeStatus(e.id, 'success'));

                // Queue outgoing nodes
                const outgoingEdges = edges.filter((e) => e.source === nodeId);
                outgoingEdges.forEach((e) => {
                    if (!visited.has(e.target)) {
                        queue.push(e.target);
                    }
                });
            } else {
                updateNodeStatus(nodeId, 'failed');
                incomingEdges.forEach((e) => updateEdgeStatus(e.id, 'failed'));
                failed = true;
                failedNodeId = nodeId;
                break;
            }

            await delay(300); // Brief pause between nodes
        }

        isRunningRef.current = false;

        // Send final notification
        if (shouldStopRef.current) {
            onNotify('warning', 'Pipeline stopped');
        } else if (failed && failedNodeId) {
            const failedNode = nodes.find((n) => n.id === failedNodeId);
            onNotify('error', `Pipeline failed at node: ${failedNode?.data?.label || failedNodeId}`);
        } else {
            onNotify('info', 'Pipeline completed successfully');
        }
    }, [nodes, edges, setNodes, setEdges, onNotify, stepDelay, updateNodeStatus, updateEdgeStatus]);

    const stopPipeline = useCallback(() => {
        shouldStopRef.current = true;
    }, []);

    return {
        runPipeline,
        stopPipeline,
        isRunning: isRunningRef.current,
        updateNodeStatus,
        updateEdgeStatus,
    };
}
