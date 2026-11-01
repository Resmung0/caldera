import { IParser } from "../IParser";
import { PipelineData, PipelineEdge, PipelineNode } from "../../../shared/types";

type PrefectDecorator = "flow" | "task";

interface DecoratedFunction {
  name: string;
  decorator: PrefectDecorator;
  bodyStart: number;
  bodyEnd: number;
  indentation: number;
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
    const callableNames = functions.map(({ name }) => name);
    const functionsByName = new Map(functions.map((fn) => [fn.name, fn]));
    const flowCalls = new Map(
      functions
        .filter(({ decorator }) => decorator === "flow")
        .map((flow) => [
          flow.name,
          this.getCalledFunctions(
            content.slice(flow.bodyStart, flow.bodyEnd),
            callableNames
          ),
        ] as const)
    );
    const flowParents = this.getFlowParents(flowCalls, functionsByName);
    const flowTasks = new Map<string, string[]>();
    for (const flowName of flowCalls.keys()) {
      flowTasks.set(
        flowName,
        this.getNestedTasks(flowName, flowCalls, functionsByName)
      );
    }

    this.extractEdgesFromFlows(content, functions, flowCalls, edges);

    for (const fn of functions) {
      const { name, decorator } = fn;
      const taskIds = flowTasks.get(name) ?? [];
      const parentFlowIds = flowParents.get(name) ?? [];
      const childFlowIds = flowCalls.get(name)?.filter(
        (calledName) => functionsByName.get(calledName)?.decorator === "flow"
      ) ?? [];
      nodes.push({
        id: name,
        label: name,
        type: "default",
        data: {
          framework: this.name,
          prefectType: decorator,
          ...(decorator === "flow"
            ? {
                prefectFlowIds: parentFlowIds,
                prefectChildFlowIds: childFlowIds,
                prefectTaskIds: taskIds,
                prefectTaskCount: taskIds.length,
                prefectTasks: taskIds.map((taskId) => ({
                  id: taskId,
                  label: taskId,
                  dependencies: edges
                    .filter((edge) => edge.target === taskId && taskIds.includes(edge.source))
                    .map((edge) => edge.source),
                })),
              }
            : {
                prefectFlowIds: Array.from(flowCalls)
                  .filter(([, calledNames]) =>
                    calledNames.includes(name) &&
                    functionsByName.get(name)?.decorator === "task"
                  )
                  .map(([flowName]) => flowName),
              }),
        },
      });
    }

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
    const functionRegex = /^([ \t]*)(?:async\s+)?def\s+(\w+)\s*\([^)]*\)\s*(?:->\s*[^:]+)?:/gm;

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
          name: match[2],
          decorator,
          bodyStart: functionRegex.lastIndex,
          bodyEnd: content.length,
          indentation: match[1].length,
        });
      }
    }

    return functions.map((fn) => {
      const body = content.slice(fn.bodyStart);
      const lineRegex = /[^\r\n]+/g;
      let bodyEnd = content.length;
      let lineMatch: RegExpExecArray | null;
      while ((lineMatch = lineRegex.exec(body)) !== null) {
        const line = lineMatch[0];
        if (line.trim() && !line.trimStart().startsWith("#")) {
          const indentation = line.match(/^[ \t]*/)?.[0].length ?? 0;
          if (indentation <= fn.indentation) {
            bodyEnd = fn.bodyStart + lineMatch.index;
            break;
          }
        }
      }
      return {
        ...fn,
        bodyEnd,
      };
    });
  }

  private getCalledFunctions(flowBody: string, callableNames: string[]): string[] {
    return callableNames.filter((name) =>
      new RegExp(`\\b${name}(?:\\.submit)?\\s*\\(`).test(flowBody)
    );
  }

  private getNestedTasks(
    flowName: string,
    flowCalls: Map<string, string[]>,
    functionsByName: Map<string, DecoratedFunction>,
    visitedFlows = new Set<string>()
  ): string[] {
    if (visitedFlows.has(flowName)) return [];
    const nextVisitedFlows = new Set(visitedFlows).add(flowName);
    const taskIds = new Set<string>();

    for (const calledName of flowCalls.get(flowName) ?? []) {
      const calledFunction = functionsByName.get(calledName);
      if (calledFunction?.decorator === "task") {
        taskIds.add(calledName);
      } else if (calledFunction?.decorator === "flow") {
        for (const taskId of this.getNestedTasks(
          calledName,
          flowCalls,
          functionsByName,
          nextVisitedFlows
        )) {
          taskIds.add(taskId);
        }
      }
    }

    return Array.from(taskIds);
  }

  private getFlowParents(
    flowCalls: Map<string, string[]>,
    functionsByName: Map<string, DecoratedFunction>
  ): Map<string, string[]> {
    const parents = new Map<string, string[]>();
    for (const [parentFlowId, calledNames] of flowCalls) {
      for (const childName of calledNames) {
        if (functionsByName.get(childName)?.decorator !== "flow") continue;
        const childParents = parents.get(childName) ?? [];
        childParents.push(parentFlowId);
        parents.set(childName, childParents);
      }
    }
    return parents;
  }

  private extractEdgesFromFlows(
    content: string,
    functions: DecoratedFunction[],
    flowCalls: Map<string, string[]>,
    edges: PipelineEdge[]
  ): void {
    const functionsByName = new Map(functions.map((fn) => [fn.name, fn]));
    const callableNames = new Set(functionsByName.keys());
    const edgeIds = new Set<string>();
    const addEdge = (source: string, target: string) => {
      const id = `e-${source}-${target}`;
      if (source !== target && !edgeIds.has(id)) {
        edgeIds.add(id);
        edges.push({ id, source, target });
      }
    };

    for (const flow of functions.filter(({ decorator }) => decorator === "flow")) {
      const flowBody = content.slice(flow.bodyStart, flow.bodyEnd);
      const callRegex = /\b(\w+)(?:\.submit)?\s*\(([^)]*)\)/g;
      const assignmentRegex = /\b(\w+)\s*=\s*(\w+)(?:\.submit)?\s*\(/g;
      const assignments: Array<{ variable: string; functionName: string; position: number }> = [];
      let assignment: RegExpExecArray | null;
      while ((assignment = assignmentRegex.exec(flowBody)) !== null) {
        if (callableNames.has(assignment[2])) {
          assignments.push({
            variable: assignment[1],
            functionName: assignment[2],
            position: assignment.index,
          });
        }
      }

      let call: RegExpExecArray | null;
      while ((call = callRegex.exec(flowBody)) !== null) {
        const target = call[1];
        const args = call[2];
        if (!callableNames.has(target)) continue;

        const sources = new Set<string>();
        const directCallRegex = /\b(\w+)(?:\.submit)?\s*\(/g;
        let directCall: RegExpExecArray | null;
        while ((directCall = directCallRegex.exec(args)) !== null) {
          if (callableNames.has(directCall[1])) sources.add(directCall[1]);
        }
        for (const { variable, functionName, position } of assignments) {
          if (
            position < call.index &&
            new RegExp(`\\b${variable}\\b`).test(args)
          ) {
            sources.add(functionName);
          }
        }
        for (const source of sources) addEdge(source, target);
      }

      for (const childFlowId of flowCalls.get(flow.name) ?? []) {
        if (functionsByName.get(childFlowId)?.decorator === "flow") {
          addEdge(childFlowId, flow.name);
        }
      }
    }
  }
}
