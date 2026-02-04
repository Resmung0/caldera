import * as yaml from 'js-yaml';
import { IParser } from "../IParser";
import { PipelineData, PipelineNode, PipelineEdge } from "../../../shared/types";

type ParsedJob = {
  id: string;
  name: string;
  stage: string;
  needs?: (string | { job: string })[];
  [key: string]: any;
};

export class GitLabCIParser implements IParser {
  name = "GitLab CI";

  private readonly reservedKeywords = [
    'image', 'services', 'stages', 'types', 'before_script',
    'after_script', 'variables', 'cache', 'include', 'workflow', 'default'
  ];

  canParse(fileName: string, content: string): boolean {
    const normalizedPath = fileName.replace(/\\/g, '/');
    const segments = normalizedPath.split('/');

    if (segments.some(s => s === '.gitlab-ci.yml' || s === '.gitlab-ci.yaml')) {
      return true;
    }

    const gitlabIndex = segments.indexOf('.gitlab');
    const ciIndex = segments.indexOf('ci');
    if (gitlabIndex !== -1 && ciIndex === gitlabIndex + 1 &&
      (normalizedPath.endsWith('.yml') || normalizedPath.endsWith('.yaml'))) {
      return true;
    }

    return false;
  }

  async parse(content: string, filePath: string): Promise<PipelineData> {
    try {
      const doc = yaml.load(content) as any;
      if (!doc || typeof doc !== 'object') {
        return { filePath, framework: this.name, nodes: [], edges: [] };
      }

      const stages = Array.isArray(doc.stages) ? doc.stages : ['.pre', 'build', 'test', 'deploy', '.post'];

      const jobs = this.getJobsFromDoc(doc);
      const nodes = this.buildNodesFromJobs(jobs);
      const edges: PipelineEdge[] = [];

      const jobIds = new Set(jobs.map(j => j.id));

      this.buildNeedsEdges(jobs, jobIds, edges);
      this.buildStageEdges(jobs, stages, edges);

      return {
        filePath,
        framework: this.name,
        nodes,
        edges,
      };
    } catch (e) {
      console.error('Failed to parse GitLab CI', e);
      return { filePath, framework: this.name, nodes: [], edges: [] };
    }
  }

  private getJobsFromDoc(doc: any): ParsedJob[] {
    const jobs: ParsedJob[] = [];

    Object.keys(doc).forEach(key => {
      if (this.reservedKeywords.includes(key) || key.startsWith('.')) {
        return;
      }

      const job = doc[key];
      if (job && typeof job === 'object' && !Array.isArray(job)) {
        const stage = job.stage || 'test';
        jobs.push({ id: key, name: key, stage, ...job });
      }
    });

    return jobs;
  }

  private buildNodesFromJobs(jobs: ParsedJob[]): PipelineNode[] {
    return jobs.map(job => ({
      id: job.id,
      label: job.id,
      type: 'default',
      data: {
        stage: job.stage
      }
    }));
  }

  private buildNeedsEdges(jobs: ParsedJob[], jobIds: Set<string>, edges: PipelineEdge[]): void {
    jobs.forEach(job => {
      if (job.needs && Array.isArray(job.needs)) {
        job.needs.forEach((need: any) => {
          const needId = typeof need === 'string' ? need : need.job;
          if (needId && jobIds.has(needId)) {
            edges.push({
              id: `e-${needId}-${job.id}`,
              source: needId,
              target: job.id
            });
          }
        });
      }
    });
  }

  private buildStageEdges(jobs: ParsedJob[], stages: string[], edges: PipelineEdge[]): void {
    const stageIndex = new Map<string, number>();
    stages.forEach((stage, index) => stageIndex.set(stage, index));

    const jobsByStage = new Map<string, ParsedJob[]>();
    jobs.forEach(job => {
      const list = jobsByStage.get(job.stage) ?? [];
      list.push(job);
      jobsByStage.set(job.stage, list);
    });

    jobs.forEach(job => {
      const hasNeeds = job.needs !== undefined;
      if (hasNeeds) return;

      const currentIndex = stageIndex.get(job.stage);
      if (currentIndex === undefined || currentIndex <= 0) return;

      // GitLab default behavior: a job depends on all jobs in ALL previous stages if "needs" is not specified.
      for (let i = currentIndex - 1; i >= 0; i--) {
        const previousStage = stages[i];
        const previousStageJobs = jobsByStage.get(previousStage) ?? [];

        previousStageJobs.forEach(prevJob => {
          edges.push({
            id: `e-stage-${prevJob.id}-${job.id}`,
            source: prevJob.id,
            target: job.id
          });
        });

        // Per review comment 1, we do NOT break here to include all previous stages.
        // Note: This may create redundant edges in linear pipelines.
      }
    });
  }
}
