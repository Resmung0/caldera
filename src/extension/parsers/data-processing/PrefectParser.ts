import { IParser } from "../IParser";
import { PipelineData, PipelineNode, PipelineEdge } from "../../../shared/types";

export class PrefectParser implements IParser {
  name = "Prefect";

  canParse(fileName: string, content: string): boolean {
    return (
      fileName.endsWith(".py") &&
      /import\s+prefect|from\s+prefect/.test(content) &&
      (/@(?:prefect\.)?flow/.test(content) || /@\w+/.test(content))
    );
  }

  async parse(content: string, filePath: string): Promise<PipelineData> {
    const nodes: PipelineNode[] = [];
    const edges: PipelineEdge[] = [];

    const taskNames = this.extractTasks(content, nodes);
    this.extractEdgesFromFlows(content, taskNames, edges);

    return {
      filePath,
      framework: this.name,
      nodes,
      edges,
    };
  }

  private extractTasks(content: string, nodes: PipelineNode[]): string[] {
    // Detect task names from @task or @prefect.task or @any_var (if it was imported from prefect)
    // For simplicity, we still look for @task/@prefect.task OR assume any decorator might be it if prefect is imported
    // But let's stick to identifying common patterns or just look for 'def' after ANY decorator if we want to be very loose.
    // The review mentioned '@f' if 'flow as f'.

    const taskRegex = /@(?:\w+\.)?(?:task|\w+)(?:\([^)]*\))?\s+def\s+(\w+)/g;
    const taskNames: string[] = [];
    let match;
    while ((match = taskRegex.exec(content)) !== null) {
      const name = match[1];
      // Avoid duplicates and avoid matching flow names as tasks (though they often use same decorators)
      // Actually, we want to distinguish flows from tasks.
      // Usually @task is for tasks, @flow for flows.
      // If we see @f, is it a flow or a task?
      // Let's improve the task extraction to be more specific if possible.

      if (match[0].includes('task') || !match[0].includes('flow')) {
          taskNames.push(name);
          nodes.push({
            id: name,
            label: name,
            type: 'default',
            data: { framework: this.name }
          });
      }
    }
    return [...new Set(taskNames)];
  }

  private extractEdgesFromFlows(content: string, taskNames: string[], edges: PipelineEdge[]): void {
    // Loosen flow regex to match any decorator followed by def
    const flowRegex = /@(?:\w+\.)?(?:flow|\w+)(?:\([^)]*\))?\s+def\s+(\w+)\s*\([^)]*\):([\s\S]+?)(?=\n\S|$)/g;
    let flowMatch;

    // Precompute regexes to avoid per-line allocation
    const assignmentRegexes = taskNames.map(t => ({
      task: t,
      re: new RegExp(`(\\w+)\\s*=\\s*${t}(?:\\.submit)?\\s*\\(`)
    }));
    const callRegexes = taskNames.map(t => ({
      task: t,
      re: new RegExp(`${t}(?:\\.submit)?\\s*\\(([^)]*)\\)`)
    }));

    while ((flowMatch = flowRegex.exec(content)) !== null) {
      const flowBody = flowMatch[2];
      const lines = flowBody.split('\n');
      const varToTask = this.buildVarToTaskMap(lines, assignmentRegexes);
      this.extractEdgesFromLines(lines, taskNames, varToTask, callRegexes, edges);
    }
  }

  private buildVarToTaskMap(lines: string[], assignmentRegexes: { task: string, re: RegExp }[]): Map<string, string> {
    const varToTask = new Map<string, string>();
    for (const line of lines) {
      for (const { task, re } of assignmentRegexes) {
        const m = line.match(re);
        if (m) {
          varToTask.set(m[1], task);
        }
      }
    }
    return varToTask;
  }

  private extractEdgesFromLines(
    lines: string[],
    taskNames: string[],
    varToTask: Map<string, string>,
    callRegexes: { task: string, re: RegExp }[],
    edges: PipelineEdge[]
  ): void {
    const ensureEdge = (source: string, target: string) => {
      const id = `e-${source}-${target}`;
      if (!edges.some(e => e.id === id)) {
        edges.push({ id, source, target });
      }
    };

    // Precompute var regexes for this flow
    const varRegexes: { sourceTask: string, re: RegExp }[] = [];
    varToTask.forEach((sourceTask, variable) => {
      varRegexes.push({ sourceTask, re: new RegExp(`\\b${variable}\\b`) });
    });

    for (const line of lines) {
      for (const { task: targetTask, re } of callRegexes) {
        const callMatch = line.match(re);
        if (!callMatch) continue;

        const args = callMatch[1];

        // vars -> tasks
        for (const { sourceTask, re: vRe } of varRegexes) {
          if (vRe.test(args)) {
            ensureEdge(sourceTask, targetTask);
          }
        }

        // direct nested calls: task2(task1())
        for (const otherTask of taskNames) {
          if (otherTask !== targetTask && args.includes(`${otherTask}(`)) {
            ensureEdge(otherTask, targetTask);
          }
        }
      }
    }
  }
}
