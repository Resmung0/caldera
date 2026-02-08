/**
 * @jest-environment jsdom
 */
/**
 * Unit tests for buildExecutionPlan - Task 5.5
 * 
 * Feature: pipeline-runner-refactoring
 * Task: 5.5 Write unit tests for buildExecutionPlan
 */

import { buildExecutionPlan } from '../src/webview/hooks/usePipelineRunner';
import { Node, Edge } from 'reactflow';

describe('buildExecutionPlan - Task 5.5: Specific Patterns', () => {

    test('linear pipeline: A -> B -> C', () => {
        const nodes = [
            { id: 'A', position: { x: 0, y: 0 }, data: {} },
            { id: 'B', position: { x: 0, y: 0 }, data: {} },
            { id: 'C', position: { x: 0, y: 0 }, data: {} }
        ] as Node[];
        const edges = [
            { id: 'e1', source: 'A', target: 'B' },
            { id: 'e2', source: 'B', target: 'C' }
        ] as Edge[];

        const plan = buildExecutionPlan(nodes, edges);
        expect(plan).toEqual(['A', 'B', 'C']);
    });

    test('branching pipeline: A -> B, A -> C', () => {
        const nodes = [
            { id: 'A', position: { x: 0, y: 0 }, data: {} },
            { id: 'B', position: { x: 0, y: 0 }, data: {} },
            { id: 'C', position: { x: 0, y: 0 }, data: {} }
        ] as Node[];
        const edges = [
            { id: 'e1', source: 'A', target: 'B' },
            { id: 'e2', source: 'A', target: 'C' }
        ] as Edge[];

        const plan = buildExecutionPlan(nodes, edges);
        // A must be first. B and C can be in any order since they are at the same depth
        expect(plan[0]).toBe('A');
        expect(plan).toContain('B');
        expect(plan).toContain('C');
        expect(plan.length).toBe(3);
    });

    test('diamond pattern: A -> B, A -> C, B -> D, C -> D', () => {
        const nodes = [
            { id: 'A', position: { x: 0, y: 0 }, data: {} },
            { id: 'B', position: { x: 0, y: 0 }, data: {} },
            { id: 'C', position: { x: 0, y: 0 }, data: {} },
            { id: 'D', position: { x: 0, y: 0 }, data: {} }
        ] as Node[];
        const edges = [
            { id: 'e1', source: 'A', target: 'B' },
            { id: 'e2', source: 'A', target: 'C' },
            { id: 'e3', source: 'B', target: 'D' },
            { id: 'e4', source: 'C', target: 'D' }
        ] as Edge[];

        const plan = buildExecutionPlan(nodes, edges);
        expect(plan[0]).toBe('A');
        expect(plan[plan.length - 1]).toBe('D');
        expect(plan).toContain('B');
        expect(plan).toContain('C');

        // Topological check: A < B, A < C, B < D, C < D
        const indexOfA = plan.indexOf('A');
        const indexOfB = plan.indexOf('B');
        const indexOfC = plan.indexOf('C');
        const indexOfD = plan.indexOf('D');

        expect(indexOfA).toBeLessThan(indexOfB);
        expect(indexOfA).toBeLessThan(indexOfC);
        expect(indexOfB).toBeLessThan(indexOfD);
        expect(indexOfC).toBeLessThan(indexOfD);
    });

    test('empty pipeline', () => {
        const plan = buildExecutionPlan([], []);
        expect(plan).toEqual([]);
    });

    test('single node pipeline', () => {
        const nodes = [{ id: 'A', position: { x: 0, y: 0 }, data: {} }] as Node[];
        const plan = buildExecutionPlan(nodes, []);
        expect(plan).toEqual(['A']);
    });

    test('disconnected components: A -> B, C -> D', () => {
        const nodes = [
            { id: 'A', position: { x: 0, y: 0 }, data: {} },
            { id: 'B', position: { x: 0, y: 0 }, data: {} },
            { id: 'C', position: { x: 0, y: 0 }, data: {} },
            { id: 'D', position: { x: 0, y: 0 }, data: {} }
        ] as Node[];
        const edges = [
            { id: 'e1', source: 'A', target: 'B' },
            { id: 'e2', source: 'C', target: 'D' }
        ] as Edge[];

        const plan = buildExecutionPlan(nodes, edges);
        expect(plan).toContain('A');
        expect(plan).toContain('B');
        expect(plan).toContain('C');
        expect(plan).toContain('D');

        expect(plan.indexOf('A')).toBeLessThan(plan.indexOf('B'));
        expect(plan.indexOf('C')).toBeLessThan(plan.indexOf('D'));
    });
});
