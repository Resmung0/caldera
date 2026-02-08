import { useCallback, useRef, useState } from 'react';
import { Node, Edge } from 'reactflow';

export type PipelineStatus = 'idle' | 'processing' | 'success' | 'failed';

/**
 * Builds an execution plan for a pipeline graph using BFS traversal.
 * 
 * This pure function performs a topological sort on the pipeline graph to determine
 * the correct execution order. It uses Breadth-First Search (BFS) starting from root
 * nodes (nodes with no incoming edges) and traverses the graph following the edges.
 * 
 * Algorithm:
 * 1. Identify root nodes - nodes that have no incoming edges
 * 2. Initialize a queue with all root nodes
 * 3. Use BFS to traverse the graph:
 *    - Dequeue a node
 *    - Add it to the execution plan if not already visited
 *    - Find all outgoing edges from this node
 *    - Enqueue target nodes that haven't been visited
 * 4. Return the ordered array of node IDs
 * 
 * The function is pure - it has no side effects and does not mutate the input arrays.
 * Multiple calls with the same inputs will always return the same execution plan.
 * 
 * @param nodes - Array of pipeline nodes
 * @param edges - Array of pipeline edges defining dependencies
 * @returns Ordered array of node IDs representing the execution sequence
 * 
 * @example
 * ```typescript
 * const nodes = [
 *   { id: 'A', ... },
 *   { id: 'B', ... },
 *   { id: 'C', ... }
 * ];
 * const edges = [
 *   { source: 'A', target: 'B', ... },
 *   { source: 'B', target: 'C', ... }
 * ];
 * const plan = buildExecutionPlan(nodes, edges);
 * // Returns: ['A', 'B', 'C']
 * ```
 */
export function buildExecutionPlan(nodes: Node[], edges: Edge[]): string[] {
    // 1. Calculate in-degrees for all nodes
    const inDegree = new Map<string, number>();
    nodes.forEach(n => inDegree.set(n.id, 0));

    edges.forEach(e => {
        if (inDegree.has(e.target)) {
            inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
        }
    });

    // 2. Initialize queue with all nodes having in-degree 0
    const queue: string[] = [];
    nodes.forEach(n => {
        if (inDegree.get(n.id) === 0) {
            queue.push(n.id);
        }
    });

    // 3. Process the queue (Kahn's Algorithm)
    const executionPlan: string[] = [];
    const visited = new Set<string>();

    while (queue.length > 0) {
        // Sort queue to ensure deterministic behavior (optional but good for testing)
        // Here we just shift to maintain BFS-like behavior for levels
        const nodeId = queue.shift()!;

        if (visited.has(nodeId)) continue;
        visited.add(nodeId);
        executionPlan.push(nodeId);

        // Find all outgoing edges from this node
        const outgoingEdges = edges.filter(e => e.source === nodeId);

        outgoingEdges.forEach(e => {
            const targetId = e.target;
            if (inDegree.has(targetId)) {
                const newInDegree = (inDegree.get(targetId) || 1) - 1;
                inDegree.set(targetId, newInDegree);

                // If in-degree becomes 0, it's ready to be processed
                if (newInDegree === 0) {
                    queue.push(targetId);
                }
            }
        });
    }

    return executionPlan;
}
/**
 * Processes a single node step in the pipeline execution.
 *
 * This helper function encapsulates the logic for executing one node in the pipeline,
 * including status updates, edge animations, and delay handling. It provides a clean
 * separation of concerns by extracting the node processing logic from the main pipeline loop.
 *
 * Execution flow:
 * 1. Update node status to 'processing'
 * 2. Find and animate incoming edges (set to 'processing')
 * 3. Wait for the specified step delay
 * 4. Check if pipeline should stop
 * 5. Update node and edge statuses based on execution result
 * 6. Return success/stopped status
 *
 * @param nodeId - The ID of the node to process
 * @param edges - Array of all pipeline edges
 * @param updateNodeStatus - Callback to update a node's status
 * @param updateEdgeStatus - Callback to update an edge's status
 * @param stepDelay - Delay in milliseconds between processing steps
 * @param shouldStopRef - Reference to check if pipeline should stop
 * @returns Promise resolving to execution result with success and stopped flags
 *
 * @example
 * ```typescript
 * const result = await processNodeStep(
 *   'node-1',
 *   edges,
 *   updateNodeStatus,
 *   updateEdgeStatus,
 *   1500,
 *   shouldStopRef
 * );
 * if (result.stopped) {
 *   // Handle pipeline stop
 * } else if (!result.success) {
 *   // Handle node failure
 * }
 * ```
 */
export async function processNodeStep(
    nodeId: string,
    edges: Edge[],
    updateNodeStatus: (nodeId: string, status: PipelineStatus) => void,
    updateEdgeStatus: (edgeId: string, status: PipelineStatus) => void,
    stepDelay: number,
    shouldStopRef: React.MutableRefObject<boolean>
): Promise<{ success: boolean; stopped: boolean }> {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Start processing node
    updateNodeStatus(nodeId, 'processing');

    // Animate incoming edges
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    incomingEdges.forEach((e) => updateEdgeStatus(e.id, 'processing'));

    await delay(stepDelay);

    // Check if pipeline should stop
    if (shouldStopRef.current) {
        updateNodeStatus(nodeId, 'idle');
        incomingEdges.forEach((e) => updateEdgeStatus(e.id, 'idle'));
        return { success: false, stopped: true };
    }

    // Simulate success/failure (you can replace this with real logic)
    // For demo, all nodes succeed
    const nodeSucceeded = true; // Replace with actual execution result

    if (nodeSucceeded) {
        updateNodeStatus(nodeId, 'success');
        incomingEdges.forEach((e) => updateEdgeStatus(e.id, 'success'));
        return { success: true, stopped: false };
    } else {
        updateNodeStatus(nodeId, 'failed');
        incomingEdges.forEach((e) => updateEdgeStatus(e.id, 'failed'));
        return { success: false, stopped: false };
    }
}

/**
 * Finalizes a pipeline run by sending appropriate notifications based on execution outcome.
 * 
 * This helper function encapsulates the notification logic that occurs at the end of a
 * pipeline execution. It determines the appropriate notification type and message based
 * on whether the pipeline was stopped, failed, or completed successfully.
 * 
 * Notification logic:
 * - If stopped: Sends a warning notification indicating the pipeline was stopped
 * - If failed: Sends an error notification with the name of the failed node
 * - If completed: Sends a success notification indicating successful completion
 * 
 * @param wasStopped - Boolean indicating if the pipeline was manually stopped
 * @param failed - Boolean indicating if a node failed during execution
 * @param failedNodeId - The ID of the node that failed (null if no failure)
 * @param nodes - Array of all pipeline nodes (used to get the failed node's label)
 * @param onNotify - Callback function to send notifications to the user
 * 
 * @example
 * ```typescript
 * // Pipeline stopped by user
 * finalizeRun(true, false, null, nodes, onNotify);
 * // Sends: warning notification "Pipeline stopped"
 * 
 * // Pipeline failed at a node
 * finalizeRun(false, true, 'node-2', nodes, onNotify);
 * // Sends: error notification "Pipeline failed at node: Node 2"
 * 
 * // Pipeline completed successfully
 * finalizeRun(false, false, null, nodes, onNotify);
 * // Sends: info notification "Pipeline completed successfully"
 * ```
 */
export function finalizeRun(
    wasStopped: boolean,
    failed: boolean,
    failedNodeId: string | null,
    nodes: Node[],
    onNotify: (type: 'info' | 'error' | 'warning', message: string) => void
): void {
    if (wasStopped) {
        onNotify('warning', 'Pipeline stopped');
    } else if (failed && failedNodeId) {
        const failedNode = nodes.find((n) => n.id === failedNodeId);
        onNotify('error', `Pipeline failed at node: ${failedNode?.data?.label || failedNodeId}`);
    } else {
        onNotify('info', 'Pipeline completed successfully');
    }
}

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
    const [isRunning, setIsRunning] = useState(false);
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

    /**
     * Resets all node and edge statuses to 'idle'.
     * This ensures a clean slate before each pipeline run.
     */
    const resetAllStatuses = useCallback(() => {
        setNodes((nds) =>
            nds.map((n) => ({ ...n, data: { ...n.data, status: 'idle' as PipelineStatus } }))
        );
        setEdges((eds) =>
            eds.map((e) => ({ ...e, data: { ...e.data, status: 'idle' as PipelineStatus } }))
        );
    }, [setNodes, setEdges]);

    const runPipeline = useCallback(async () => {
        if (isRunningRef.current) return;

        setIsRunning(true);
        isRunningRef.current = true;
        shouldStopRef.current = false;

        // Reset all statuses to 'idle' before starting execution
        resetAllStatuses();

        // Build execution plan using BFS topological sort
        const executionPlan = buildExecutionPlan(nodes, edges);

        let failed = false;
        let failedNodeId: string | null = null;

        onNotify('info', 'Pipeline started');

        // Execute nodes in the order determined by the execution plan
        for (const nodeId of executionPlan) {
            if (shouldStopRef.current) break;

            // Process the node step
            const result = await processNodeStep(
                nodeId,
                edges,
                updateNodeStatus,
                updateEdgeStatus,
                stepDelay,
                shouldStopRef
            );

            // Handle stop request
            if (result.stopped) {
                break;
            }

            // Handle node failure
            if (!result.success) {
                failed = true;
                failedNodeId = nodeId;
                break;
            }

            await delay(300); // Brief pause between nodes
        }

        setIsRunning(false);
        isRunningRef.current = false;

        // Send final notification
        finalizeRun(shouldStopRef.current, failed, failedNodeId, nodes, onNotify);
    }, [nodes, edges, setNodes, setEdges, onNotify, stepDelay, updateNodeStatus, updateEdgeStatus, resetAllStatuses]);

    const stopPipeline = useCallback(() => {
        shouldStopRef.current = true;
    }, []);

    return {
        runPipeline,
        stopPipeline,
        isRunning,
        updateNodeStatus,
        updateEdgeStatus,
    };
}
