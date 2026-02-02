
import { DVCParser } from '../src/extension/parsers/data-processing/DVCParser';
import * as path from 'path';

// Mock dependencies
jest.mock('fs');
jest.mock('child_process');
jest.mock('vscode');

describe('DVCParser', () => {
    let parser: DVCParser;
    const cwd = '/test/cwd';

    beforeEach(() => {
        parser = new DVCParser();
        jest.clearAllMocks();
    });

    describe('buildStageMaps', () => {
        it('should correctly map stages to outputs and dependencies', () => {
            const lockData = {
                stages: {
                    prepare: {
                        outs: [{ path: 'data/prepared' }],
                        deps: [{ path: 'data/raw' }]
                    },
                    train: {
                        outs: [{ path: 'model.pkl' }],
                        deps: [{ path: 'data/prepared' }]
                    }
                }
            };

            const result = parser.buildStageMaps(lockData);

            expect(result.stageToOutputs.get('prepare')).toEqual(['data/prepared']);
            expect(result.stageToOutputs.get('train')).toEqual(['model.pkl']);
            expect(result.stageToDeps.get('prepare')).toEqual(['data/raw']);
            expect(result.stageToDeps.get('train')).toEqual(['data/prepared']);
            expect(result.outputToProducer.get('data/prepared')).toEqual('prepare');
            expect(result.outputToProducer.get('model.pkl')).toEqual('train');
        });

        it('should handle missing stages or empty data', () => {
            const result = parser.buildStageMaps({});
            expect(result.stageToOutputs.size).toBe(0);
            expect(result.stageToDeps.size).toBe(0);
        });
    });

    describe('buildStageAndArtifactNodes', () => {
        it('should create nodes for stages and their output artifacts', () => {
            const mermaid = `
                flowchart TD
                node1["prepare"]
                node2["train"]
            `;

            const stageToOutputs = new Map([
                ['prepare', ['data/prepared.csv']],
                ['train', ['model.pkl']]
            ]);
            const stageToDeps = new Map([
                ['prepare', ['data/raw.csv']],
                ['train', ['data/prepared.csv']]
            ]);
            const paramsData = {};

            const { nodes, artifactByPath } = parser.buildStageAndArtifactNodes(
                mermaid,
                stageToOutputs,
                stageToDeps,
                paramsData,
                cwd
            );

            // Should have 4 nodes: 2 stages + 2 artifacts
            expect(nodes.length).toBe(4);

            const prepareNode = nodes.find(n => n.id === 'node1');
            expect(prepareNode).toBeDefined();
            expect(prepareNode?.label).toBe('prepare');

            const artifactNode = nodes.find(n => n.label === 'data/prepared.csv');
            expect(artifactNode).toBeDefined();
            expect(artifactNode?.type).toBe('artifact');

            expect(artifactByPath.get('data/prepared.csv')).toBeDefined();
            expect(artifactByPath.get('model.pkl')).toBeDefined();
        });

        it('should categorise artifacts correctly', () => {
            const mermaid = `
                flowchart TD
                node1["prepare"]
            `;
            const stageToOutputs = new Map([
                ['prepare', ['image.png', 'data.csv', 'model.pkl', 'folder']]
            ]);

            const { nodes } = parser.buildStageAndArtifactNodes(
                mermaid,
                stageToOutputs,
                new Map(),
                {},
                cwd
            );

            const imgNode = nodes.find(n => n.label === 'image.png');
            expect(imgNode?.data.dataType).toBe('image');

            const csvNode = nodes.find(n => n.label === 'data.csv');
            expect(csvNode?.data.dataType).toBe('table');

            const folderNode = nodes.find(n => n.label === 'folder');
            expect(folderNode?.data.dataType).toBe('folder');
        });
    });

    describe('buildEdges', () => {
        it('should link stages via artifacts when possible', () => {
            const mermaid = `
                flowchart TD
                node1["prepare"]
                node2["train"]
                node1 --> node2
            `;

            // Reconstruct minimal nodes needed
            const nodes = [
                { id: 'node1', label: 'prepare', type: 'default', data: { framework: 'DVC' } },
                { id: 'node2', label: 'train', type: 'default', data: { framework: 'DVC' } },
                // artifact node
                { id: 'art-node1-0', label: 'data/prepared.csv', type: 'artifact', data: { dataType: 'table' } }
            ] as any[];

            const artifactByPath = new Map<string, any>();
            artifactByPath.set('data/prepared.csv', nodes[2]);

            const stageToOutputs = new Map([['prepare', ['data/prepared.csv']]]);
            const stageToDeps = new Map([['train', ['data/prepared.csv']]]);

            const edges = parser.buildEdges(
                mermaid,
                nodes,
                stageToOutputs,
                stageToDeps,
                artifactByPath
            );

            // Expected edges:
            // 1. prepare -> artifact (added implicitly by checking outputs)
            // 2. artifact -> train (because train depends on it)

            const sourceToArtifact = edges.find(e => e.source === 'node1' && e.target === 'art-node1-0');
            const artifactToTarget = edges.find(e => e.source === 'art-node1-0' && e.target === 'node2');

            expect(sourceToArtifact).toBeDefined();
            expect(artifactToTarget).toBeDefined();
        });

        it('should fallback to direct edge if no common artifact', () => {
            const mermaid = `
                flowchart TD
                node1["prepare"]
                node2["train"]
                node1 --> node2
            `;
            const nodes = [
                { id: 'node1', label: 'prepare', type: 'default', data: { framework: 'DVC' } },
                { id: 'node2', label: 'train', type: 'default', data: { framework: 'DVC' } }
            ] as any[];

            const edges = parser.buildEdges(
                mermaid,
                nodes,
                new Map(),
                new Map(),
                new Map()
            );

            expect(edges.length).toBe(1);
            expect(edges[0].source).toBe('node1');
            expect(edges[0].target).toBe('node2');
        });
    });
});
