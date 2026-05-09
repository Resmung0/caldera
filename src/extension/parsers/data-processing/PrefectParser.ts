import { IParser } from "../IParser";
import { PipelineData, PipelineNode, PipelineEdge } from "../../../shared/types";

export class PrefectParser implements IParser {
  name = "Prefect";

  canParse(fileName: string, content: string): boolean {
    return (
      fileName.endsWith(".py") &&
      content.includes("from prefect import") &&
      content.includes("@flow")
    );
  }

  async parse(content: string, filePath: string): Promise<PipelineData> {
    const nodes: PipelineNode[] = [];
    const edges: PipelineEdge[] = [];

    // 1. Identify tasks
    // Regex to find @task decorated functions: @task\s+def\s+(\w+)
    const taskRegex = /@task(?:\([^)]*\))?\s+def\s+(\w+)/g;
    const taskNames: string[] = [];
    let match;
    while ((match = taskRegex.exec(content)) !== null) {
      taskNames.push(match[1]);
      nodes.push({
        id: match[1],
        label: match[1],
        type: 'default',
        data: { framework: this.name }
      });
    }

    // 2. Identify the flow and its body
    const flowRegex = /@flow(?:\([^)]*\))?\s+def\s+(\w+)\s*\([^)]*\):([\s\S]+?)(?=\n\S|$)/g;
    const flowMatch = flowRegex.exec(content);
    if (flowMatch) {
      const flowBody = flowMatch[2];

      // 3. Find task calls and dependencies in the flow body
      // We look for assignments like: var = task_name(...) or task_name(...)
      // and wait_for=[...]

      const varToTask = new Map<string, string>();

      // Split body into lines to process roughly in order
      const lines = flowBody.split('\n');
      for (const line of lines) {
        // Look for assignment: var = task_name.submit(...) or var = task_name(...)
        for (const taskName of taskNames) {
          const assignmentRegex = new RegExp(`(\\w+)\\s*=\\s*${taskName}(?:\\.submit)?\\s*\\(`);
          const assignMatch = line.match(assignmentRegex);
          if (assignMatch) {
            varToTask.set(assignMatch[1], taskName);
          }

          // Look for dependencies: task_name(..., var, ...) or task_name(..., wait_for=[..., var, ...])
          const callRegex = new RegExp(`${taskName}(?:\\.submit)?\\s*\\(([^)]*)\\)`);
          const callMatch = line.match(callRegex);
          if (callMatch) {
            const args = callMatch[1];

            // Check for variables in args that map to tasks
            varToTask.forEach((sourceTask, variable) => {
              if (args.includes(variable)) {
                const edgeId = `e-${sourceTask}-${taskName}`;
                if (!edges.find(e => e.id === edgeId)) {
                  edges.push({
                    id: edgeId,
                    source: sourceTask,
                    target: taskName
                  });
                }
              }
            });

            // Check for direct calls like task2(task1())
            for (const otherTask of taskNames) {
              if (otherTask !== taskName && args.includes(`${otherTask}(`)) {
                 const edgeId = `e-${otherTask}-${taskName}`;
                 if (!edges.find(e => e.id === edgeId)) {
                    edges.push({
                      id: edgeId,
                      source: otherTask,
                      target: taskName
                    });
                 }
              }
            }
          }
        }
      }
    }

    return {
      filePath,
      framework: this.name,
      nodes,
      edges,
    };
  }
}
