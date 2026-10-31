import { IParser } from "../IParser";
import { PipelineData, PipelineEdge, PipelineNode } from "../../../shared/types";

type PrefectDecorator = "flow" | "task";

interface DecoratedFunction {
  name: string;
  decorator: PrefectDecorator;
  start: number;
  bodyStart: number;
}

export class PrefectParser implements IParser {
  name = "Prefect";

  canParse(fileName: string, content: string): boolean {
    return fileName.endsWith(".py") && this.getDecoratedFunctions(content).length > 0;
  }

  async parse(content: string, filePath: string): Promise<PipelineData> {
    const nodes: PipelineNode[] = [];
    const edges: PipelineEdge[] = [];
    const functions = this.getDecoratedFunctions(content);
    const taskNames = functions
      .filter(({ decorator }) => decorator === "task")
      .map(({ name }) => name);

    for (const { name, decorator } of functions) {
      nodes.push({
        id: name,
        label: name,
        type: "default",
        data: { framework: this.name, prefectType: decorator },
      });
    }

    this.extractEdgesFromFlows(content, taskNames, edges);

    return {
      filePath,
      framework: this.name,
      nodes,
      edges,
    };
  }

  private getDecoratedFunctions(content: string): DecoratedFunction[] {
    const aliases = new Map<string, PrefectDecorator>();
    const prefectModules = new Set<string>(["prefect"]);
    let match: RegExpExecArray | null;
    const importRegex =
      /^\s*from\s+prefect\s+import\s+([^\n]+)|^\s*import\s+prefect(?:\s+as\s+(\w+))?/gm;

    while ((match = importRegex.exec(content)) !== null) {
      if (match[1]) {
        for (const imported of match[1].split(",")) {
          const importMatch = imported.trim().match(/^(flow|task)(?:\s+as\s+(\w+))?$/);
          if (importMatch) {
            aliases.set(importMatch[2] || importMatch[1], importMatch[1] as PrefectDecorator);
          }
        }
      } else if (match[2]) {
        prefectModules.add(match[2]);
      }
    }

    const functions: DecoratedFunction[] = [];
    const functionRegex = /^[ \t]*(?:async\s+)?def\s+(\w+)\s*\([^)]*\)\s*(?:->\s*[^:]+)?:/gm;

    while ((match = functionRegex.exec(content)) !== null) {
      const decoratorLines: string[] = [];
      const precedingLines = content.slice(0, match.index).split(/\r?\n/);
      if (precedingLines.length > 0 && precedingLines[precedingLines.length - 1].trim() === "") {
        precedingLines.pop();
      }
      for (let index = precedingLines.length - 1; index >= 0; index--) {
        const line = precedingLines[index].trim();
        if (!line.startsWith("@")) break;
        decoratorLines.unshift(line.slice(1).replace(/\s*\(.*$/, "").trim());
      }

      const decorator = decoratorLines
        .map((name) => {
          const parts = name.split(".");
          if (parts.length === 1) return aliases.get(parts[0]);
          if (parts.length === 2 && prefectModules.has(parts[0]) &&
              (parts[1] === "flow" || parts[1] === "task")) {
            return parts[1] as PrefectDecorator;
          }
          return undefined;
        })
        .find((name) => name !== undefined);

      if (decorator) {
        functions.push({
          name: match[1],
          decorator,
          start: match.index,
          bodyStart: functionRegex.lastIndex,
        });
      }
    }

    return functions.map((fn, index) => {
      const nextFunctionStart = functions[index + 1]?.start ?? content.length;
      return {
        ...fn,
        bodyStart: Math.min(fn.bodyStart, nextFunctionStart),
      };
    });
  }

  private extractEdgesFromFlows(content: string, taskNames: string[], edges: PipelineEdge[]): void {
    const functions = this.getDecoratedFunctions(content).filter(({ decorator }) => decorator === "flow");
    const taskSet = new Set(taskNames);

    for (const flow of functions) {
      const nextFunction = this.getDecoratedFunctions(content)
        .find(({ start }) => start > flow.start)?.start ?? content.length;
      const flowBody = content.slice(flow.bodyStart, nextFunction);
      const calls = new Map<string, string[]>();
      const callRegex = /\b(\w+)(?:\.submit)?\s*\(([^)]*)\)/g;
      let call: RegExpExecArray | null;

      while ((call = callRegex.exec(flowBody)) !== null) {
        const calledTask = call[1];
        const args = call[2];
        if (!taskSet.has(calledTask)) continue;
        const dependencies = [...taskSet].filter((taskName) =>
          taskName !== calledTask &&
          new RegExp(`\\b${taskName}\\s*\\(`).test(args)
        );
        for (const previousTask of taskNames) {
          if (previousTask === calledTask) continue;
          const assignedResult = new RegExp(
            `\\b(\\w+)\\s*=\\s*${previousTask}(?:\\.submit)?\\s*\\(`
          ).exec(flowBody);
          if (assignedResult && new RegExp(`\\b${assignedResult[1]}\\b`).test(args)) {
            dependencies.push(previousTask);
          }
        }
        calls.set(calledTask, dependencies);
      }

      for (const [target, sources] of calls) {
        for (const source of sources) {
          const id = `e-${source}-${target}`;
          if (!edges.some((edge) => edge.id === id)) {
            edges.push({ id, source, target });
          }
        }
      }
    }
  }
}
