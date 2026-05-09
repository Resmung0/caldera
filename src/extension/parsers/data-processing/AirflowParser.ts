import { IParser } from "../IParser";
import { PipelineData, PipelineNode, PipelineEdge } from "../../../shared/types";
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

interface CommandInfo {
  command: string;
  args: string[];
}

export class AirflowParser implements IParser {
  name = "Airflow";
  private airflowCmdCache: Map<string, { commandInfo: CommandInfo; isLocal: boolean } | null> = new Map();

  canParse(fileName: string, content: string): boolean {
    const hasAirflowImport = content.includes("from airflow") || content.includes("import airflow");
    const hasDagDefinition = content.includes("DAG(") || content.includes("@dag");
    return hasAirflowImport && hasDagDefinition;
  }

  async parse(content: string, filePath: string): Promise<PipelineData> {
    const cwd = path.dirname(filePath);
    const airflowInfo = await this.getAirflowCmd(cwd);

    if (airflowInfo) {
      try {
        const dagId = this.extractDagId(content);
        if (dagId) {
          const data = await this.parseWithCLI(dagId, filePath, airflowInfo.commandInfo, cwd);
          // Enrich with snippets from local content
          data.nodes = data.nodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              codeDeps: [
                ...this.extractTaskSnippet(content, node.id),
                ...this.extractOperatorSnippet(content, node.id)
              ].slice(0, 1) // Take the first match
            }
          }));
          return data;
        }
      } catch (error) {
        console.error("Airflow CLI parsing failed, falling back to regex:", error);
      }
    }

    return this.parseWithRegex(content, filePath);
  }

  private extractDagId(content: string): string | null {
    const dagIdMatch = content.match(/dag_id=["']([^"']+)["']/);
    if (dagIdMatch) return dagIdMatch[1];

    const decoratorMatch = content.match(/@dag\s*\([^)]*dag_id=["']([^"']+)["']/);
    if (decoratorMatch) return decoratorMatch[1];

    const positionalDagMatch = content.match(/DAG\s*\(\s*["']([^"']+)["']/);
    if (positionalDagMatch) return positionalDagMatch[1];

    return null;
  }

  private async parseWithCLI(dagId: string, filePath: string, cmdInfo: CommandInfo, cwd: string): Promise<PipelineData> {
    const fullCmd = [cmdInfo.command, ...cmdInfo.args, 'dags', 'show', dagId].join(' ');
    const { stdout } = await execPromise(fullCmd, { cwd });

    if (!stdout || !stdout.includes('digraph')) {
        throw new Error("Invalid DOT output from Airflow CLI");
    }

    return this.parseDot(stdout, filePath);
  }

  private parseDot(dot: string, filePath: string): PipelineData {
    const nodes: PipelineNode[] = [];
    const edges: PipelineEdge[] = [];

    const nodeRegex = /"([^"]+)"\s+\[label="([^"]+)"/g;
    let match;
    while ((match = nodeRegex.exec(dot)) !== null) {
      nodes.push({
        id: match[1],
        label: match[2],
        type: 'default',
        data: { framework: this.name }
      });
    }

    const edgeRegex = /"([^"]+)"\s*->\s*"([^"]+)"/g;
    while ((match = edgeRegex.exec(dot)) !== null) {
      edges.push({
        id: `e-${match[1]}-${match[2]}`,
        source: match[1],
        target: match[2]
      });
    }

    return {
      filePath,
      framework: this.name,
      nodes,
      edges
    };
  }

  private parseWithRegex(content: string, filePath: string): PipelineData {
    const nodes: PipelineNode[] = [];
    const edges: PipelineEdge[] = [];

    // Regex for TaskFlow @task
    const taskDecoratorRegex = /@task(?:\([^)]*\))?\s+def\s+([a-zA-Z0-9_]+)/g;
    let match;
    while ((match = taskDecoratorRegex.exec(content)) !== null) {
      nodes.push({
        id: match[1],
        label: match[1],
        type: 'default',
        data: {
          framework: this.name,
          codeDeps: this.extractTaskSnippet(content, match[1])
        }
      });
    }

    // Regex for classic Operators
    const operatorRegex = /([a-zA-Z0-9_]+)\s*=\s*[a-zA-Z0-9_]*Operator\(\s*(?:task_id=["']([^"']+)["'])?/g;
    while ((match = operatorRegex.exec(content)) !== null) {
      const varName = match[1];
      const taskId = match[2] || varName;
      nodes.push({
        id: taskId,
        label: taskId,
        type: 'default',
        data: {
          framework: this.name,
          variableName: varName,
          codeDeps: this.extractOperatorSnippet(content, taskId) || this.extractOperatorSnippetByVar(content, varName)
        }
      });
    }

    const getTaskId = (name: string) => {
        const node = nodes.find(n => n.data?.variableName === name || n.id === name);
        return node ? node.id : name;
    };

    const bitshiftRegexGlobal = /([a-zA-Z0-9_]+)(?:\(\))?\s*(>>|<<)\s*([a-zA-Z0-9_]+)(?:\(\))?/g;
    let edgeMatch;
    while ((edgeMatch = bitshiftRegexGlobal.exec(content)) !== null) {
      const first = edgeMatch[1];
      const op = edgeMatch[2];
      const second = edgeMatch[3];

      const source = op === '>>' ? getTaskId(first) : getTaskId(second);
      const target = op === '>>' ? getTaskId(second) : getTaskId(first);

      edges.push({
        id: `e-${source}-${target}`,
        source,
        target
      });
    }

    const methodRegex = /([a-zA-Z0-9_]+)\.(set_downstream|set_upstream)\s*\(\s*([a-zA-Z0-9_]+)\s*\)/g;
    while ((edgeMatch = methodRegex.exec(content)) !== null) {
        const first = edgeMatch[1];
        const method = edgeMatch[2];
        const second = edgeMatch[3];

        const source = method === 'set_downstream' ? getTaskId(first) : getTaskId(second);
        const target = method === 'set_downstream' ? getTaskId(second) : getTaskId(first);

        edges.push({
            id: `e-${source}-${target}`,
            source,
            target
        });
    }

    return {
      filePath,
      framework: this.name,
      nodes,
      edges
    };
  }

  private extractTaskSnippet(content: string, taskId: string): any[] {
    const lines = content.split('\n');
    const startIdx = lines.findIndex((line, idx) =>
        line.includes(`@task`) &&
        (lines[idx + 1]?.includes(`def ${taskId}`) || lines[idx + 2]?.includes(`def ${taskId}`))
    );
    if (startIdx === -1) return [];

    let endIdx = startIdx + 1;
    for (let i = startIdx + 1; i < lines.length; i++) {
        if (lines[i].includes(`def ${taskId}`)) {
            const startIndent = lines[i].search(/\S/);
            for (let j = i + 1; j < lines.length; j++) {
                if (lines[j].trim() !== '' && !lines[j].trim().startsWith('#')) {
                    const currentIndent = lines[j].search(/\S/);
                    if (currentIndent <= startIndent && currentIndent !== -1) {
                        endIdx = j - 1;
                        break;
                    }
                }
                endIdx = j;
            }
            break;
        }
    }

    return [{
      path: 'dag.py',
      snippet: lines.slice(startIdx, endIdx + 1).join('\n')
    }];
  }

  private extractOperatorSnippet(content: string, taskId: string): any[] {
    const lines = content.split('\n');
    const lineIdx = lines.findIndex(line => line.includes(`task_id=["']${taskId}["']`) || line.includes(`task_id = ["']${taskId}["']`));
    if (lineIdx === -1) return [];

    return [{
      path: 'dag.py',
      snippet: lines[lineIdx].trim()
    }];
  }

  private extractOperatorSnippetByVar(content: string, varName: string): any[] {
    const lines = content.split('\n');
    const lineIdx = lines.findIndex(line => line.includes(`${varName} =`) && line.includes('Operator'));
    if (lineIdx === -1) return [];

    return [{
      path: 'dag.py',
      snippet: lines[lineIdx].trim()
    }];
  }

  private async getAirflowCmd(cwd: string): Promise<{ commandInfo: CommandInfo; isLocal: boolean } | null> {
    if (this.airflowCmdCache.has(cwd)) {
      return this.airflowCmdCache.get(cwd)!;
    }

    const isWindows = process.platform === 'win32';
    const venvDirs = ['.venv', 'venv', 'env'];
    const venvPaths: string[] = [];
    for (const dir of venvDirs) {
      venvPaths.push(
        path.join(cwd, dir, isWindows ? 'Scripts' : 'bin', isWindows ? 'airflow.exe' : 'airflow')
      );
    }

    let commandInfo: CommandInfo | null = null;
    let isLocal = false;

    for (const venvAirflow of venvPaths) {
      if (fs.existsSync(venvAirflow)) {
        commandInfo = { command: venvAirflow, args: [] };
        isLocal = true;
        break;
      }
    }

    if (!commandInfo) {
      try {
        await execPromise('uv --version');
        await execPromise('uv run airflow version', { cwd });
        commandInfo = { command: 'uv', args: ['run', 'airflow'] };
      } catch { }
    }

    if (!commandInfo) {
      try {
        await execPromise('airflow version');
        commandInfo = { command: 'airflow', args: [] };
      } catch { }
    }

    const result = commandInfo ? { commandInfo, isLocal } : null;
    this.airflowCmdCache.set(cwd, result);
    return result;
  }
}
