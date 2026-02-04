import * as yaml from 'js-yaml';
import { IParser } from "../IParser";
import { PipelineData, PipelineNode, PipelineEdge } from "../../../shared/types";

export class GitLabCIParser implements IParser {
  name = "GitLab CI";

  private readonly reservedKeywords = [
    'image', 'services', 'stages', 'types', 'before_script',
    'after_script', 'variables', 'cache', 'include', 'workflow', 'default'
  ];

  canParse(fileName: string, content: string): boolean {
    const normalizedPath = fileName.replace(/\\/g, '/');
    return normalizedPath.endsWith(".gitlab-ci.yml") ||
      normalizedPath.endsWith(".gitlab-ci.yaml") ||
      normalizedPath.includes(".gitlab/ci/");
  }

  async parse(content: string, filePath: string): Promise<PipelineData> {
    try {
      const doc = yaml.load(content) as any;
      if (!doc || typeof doc !== 'object') {
        return { filePath, framework: this.name, nodes: [], edges: [] };
      }

      const nodes: PipelineNode[] = [];
      const edges: PipelineEdge[] = [];

      const stages = Array.isArray(doc.stages) ? doc.stages : ['.pre', 'build', 'test', 'deploy', '.post'];
      const jobs: any[] = [];

      // 1. Identify jobs
      Object.keys(doc).forEach(key => {
        if (this.reservedKeywords.includes(key) || key.startsWith('.')) {
          return;
        }

        const job = doc[key];
        if (job && typeof job === 'object') {
          const stage = job.stage || 'test';
          const jobInfo = { id: key, name: key, stage, ...job };
          jobs.push(jobInfo);
          nodes.push({
            id: key,
            label: key,
            type: 'default',
            data: {
              stage: stage
            }
          });
        }
      });

      // 2. Extract explicit dependencies (needs)
      jobs.forEach(job => {
        if (job.needs && Array.isArray(job.needs)) {
          job.needs.forEach((need: any) => {
            const needId = typeof need === 'string' ? need : need.job;
            if (needId) {
              edges.push({
                id: `e-${needId}-${job.id}`,
                source: needId,
                target: job.id
              });
            }
          });
        }
      });

      // 3. Extract implicit stage dependencies if no "needs" are present for the job
      // GitLab default behavior: a job depends on all jobs in previous stages if "needs" is not specified.
      // If "needs" is defined (even if empty: []), it overrides the default behavior.
      // We look for the nearest previous stage that has jobs.
      jobs.forEach(job => {
        const hasNeeds = job.needs !== undefined;
        if (!hasNeeds) {
          const currentStageIndex = stages.indexOf(job.stage);
          if (currentStageIndex > 0) {
            for (let i = currentStageIndex - 1; i >= 0; i--) {
              const previousStage = stages[i];
              const previousStageJobs = jobs.filter(j => j.stage === previousStage);
              if (previousStageJobs.length > 0) {
                previousStageJobs.forEach(prevJob => {
                  edges.push({
                    id: `e-stage-${prevJob.id}-${job.id}`,
                    source: prevJob.id,
                    target: job.id
                  });
                });
                break; // Found the nearest previous stage with jobs
              }
            }
          }
        }
      });

      return {
        filePath,
        framework: this.name,
        nodes,
        edges,
      };
    } catch (e) {
      console.error('Failed to parse GitLab CI', e);
      return { filePath, framework: 'Unknown', nodes: [], edges: [] };
    }
  }
}
