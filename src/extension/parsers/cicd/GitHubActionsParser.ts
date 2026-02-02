import * as yaml from 'js-yaml';
import { IParser } from '../IParser';
import { PipelineData, PipelineNode, PipelineEdge } from '../../../shared/types';

export class GitHubActionsParser implements IParser {
    name = 'GitHub Action';

    canParse(fileName: string, content: string): boolean {
        return fileName.endsWith('.yml') || fileName.endsWith('.yaml');
    }

    async parse(content: string, filePath: string): Promise<PipelineData> {
        try {
            const doc = yaml.load(content) as any;
            const nodes: PipelineNode[] = [];
            const edges: PipelineEdge[] = [];

            if (doc && doc.jobs) {
                Object.keys(doc.jobs).forEach(jobId => {
                    const job = doc.jobs[jobId];
                    nodes.push({
                        id: jobId,
                        label: job.name || jobId,
                        type: 'default'
                    });

                    if (job.needs) {
                        const needs = Array.isArray(job.needs) ? job.needs : [job.needs];
                        needs.forEach((need: string) => {
                            edges.push({
                                id: `e-${need}-${jobId}`,
                                source: need,
                                target: jobId
                            });
                        });
                    }
                });
            }

            return {
                filePath,
                framework: this.name,
                nodes,
                edges
            };
        } catch (e) {
            console.error('Failed to parse GitHub Action', e);
            return { filePath, framework: 'Unknown', nodes: [], edges: [] };
        }
    }
}
