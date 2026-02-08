/**
 * @jest-environment jsdom
 */
/**
 * Property-based tests for Execution Plan - Task 5.3
 * 
 * Feature: pipeline-runner-refactoring
 * Property 4: Execution Plan Topological Ordering
 * Property 5: Execution Plan Purity
 */

import * as fc from 'fast-check';
import { buildExecutionPlan } from '../src/webview/hooks/usePipelineRunner';
import { arbPipeline, isTopologicalOrder, createFCParams } from './pipelineTestUtils';

describe('buildExecutionPlan - Task 5.3: Topological Ordering', () => {

    test('Property 4: Execution Plan Topological Ordering - Source nodes appear before target nodes', () => {
        fc.assert(
            fc.property(arbPipeline(), (graph) => {
                const plan = buildExecutionPlan(graph.nodes, graph.edges);

                // All nodes in graph should be in plan (if connected or roots)
                // Actually BFS from roots only reaches connected nodes.
                // Disconnected components WITHOUT roots (cycles) might be missed, 
                // but arbPipeline generates DAGs or pipelines with roots.

                // Assertion: for every edge (u, v), index(u) < index(v)
                const isOrdered = isTopologicalOrder(plan, graph.edges);

                if (!isOrdered) {
                    throw new Error(`Plan is not topolocially ordered: ${JSON.stringify(plan)}`);
                }

                expect(isOrdered).toBe(true);

                // Also verify that the plan contains all nodes that ARE reachable from roots
                // (For simplicity, we just check topological order here as that's the property)
            }),
            createFCParams()
        );
    });

    test('Property 5: Execution Plan Purity - Consistent output and no input mutations', () => {
        fc.assert(
            fc.property(arbPipeline(), (graph) => {
                // We use shallow clones of the arrays to check if the arrays themselves were mutated (elements added/removed)
                // And we check deterministic output.
                const nodesBefore = [...graph.nodes];
                const edgesBefore = [...graph.edges];

                const plan1 = buildExecutionPlan(graph.nodes, graph.edges);

                // Verify arrays weren't mutated (shallow check is often enough to catch errors in Kahn's)
                expect(graph.nodes).toEqual(nodesBefore);
                expect(graph.edges).toEqual(edgesBefore);

                const plan2 = buildExecutionPlan(graph.nodes, graph.edges);

                // Verify deterministic output
                expect(plan1).toEqual(plan2);
            }),
            createFCParams()
        );
    });

    test('Execution plan handles empty graphs', () => {
        const plan = buildExecutionPlan([], []);
        expect(plan).toEqual([]);
    });

    test('Execution plan handles cycles gracefully (does not infinite loop)', () => {
        const nodes = [
            { id: '1', data: {}, position: { x: 0, y: 0 } },
            { id: '2', data: {}, position: { x: 0, y: 0 } }
        ];
        const edges = [
            { id: 'e1', source: '1', target: '2' },
            { id: 'e2', source: '2', target: '1' }
        ];

        // With BFS from roots, if there's a cycle and NO roots, queue is empty.
        // If there's a root and then a cycle, 'visited' set prevents infinite loop.
        const plan = buildExecutionPlan(nodes as any, edges as any);
        expect(plan.length).toBeLessThanOrEqual(2);
    });
});
