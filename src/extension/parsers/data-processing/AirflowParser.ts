import { IParser } from "../IParser";
import { PipelineData, PipelineNode, PipelineEdge, CodeSnippet } from "../../../shared/types";
import * as fs from 'fs';
import * as path from 'path';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const execFilePromise = promisify(execFile);

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

    const cliResult = airflowInfo
      ? await this.tryParseWithCLI(content, filePath, airflowInfo.commandInfo, cwd)
      : null;

    return cliResult ?? this.parseWithRegex(content, filePath);
  }

  private async tryParseWithCLI(
    content: string,
    filePath: string,
    cmdInfo: CommandInfo,
    cwd: string
  ): Promise<PipelineData | null> {
    const dagId = this.extractDagId(content);
    if (!dagId) return null;

    try {
      const data = await this.parseWithCLI(dagId, filePath, cmdInfo, cwd);
      data.nodes = data.nodes.map(node => {
        const taskSnippets = this.extractTaskSnippet(content, filePath, node.id);
        const opSnippets = this.extractOperatorSnippet(content, filePath, node.id);

        return {
          ...node,
          data: {
            ...node.data,
            codeDeps: [...taskSnippets, ...opSnippets].slice(0, 1),
          },
        };
      });
      return data;
    } catch (error) {
      console.error("Airflow CLI parsing failed, falling back to regex:", error);
      return null;
    }
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
    const args = [...cmdInfo.args, 'dags', 'show', dagId];
    const { stdout } = await execFilePromise(cmdInfo.command, args, { cwd });

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
          codeDeps: this.extractTaskSnippet(content, filePath, match[1])
        }
      });
    }

    // Regex for classic Operators
    const operatorRegex = /([a-zA-Z0-9_]+)\s*=\s*[a-zA-Z0-9_]*Operator\(\s*(?:task_id=["']([^"']+)["'])?/g;
    while ((match = operatorRegex.exec(content)) !== null) {
      const varName = match[1];
      const taskId = match[2] || varName;

      const byTaskId = this.extractOperatorSnippet(content, filePath, taskId);
      const codeDeps = byTaskId.length > 0
        ? byTaskId
        : this.extractOperatorSnippetByVar(content, filePath, varName);

      nodes.push({
        id: taskId,
        label: taskId,
        type: 'default',
        data: {
          framework: this.name,
          variableName: varName,
          codeDeps
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

  private findLineIndex(lines: string[], predicate: (line: string, idx: number) => boolean): number {
    return lines.findIndex(predicate);
  }

  private getIndentedBlock(lines: string[], headerIdx: number): { start: number; end: number } {
    const defIdx = lines.findIndex((line, i) => i >= headerIdx && line.includes('def ') && !line.trim().startsWith('#'));
    if (defIdx === -1) return { start: headerIdx, end: headerIdx };

    const startIndent = lines[defIdx].search(/\S/);
    let endIdx = defIdx;

    for (let i = defIdx + 1; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed === '' || trimmed.startsWith('#')) {
        endIdx = i;
        continue;
      }
      const currentIndent = lines[i].search(/\S/);
      if (currentIndent <= startIndent && currentIndent !== -1) break;
      endIdx = i;
    }

    return { start: headerIdx, end: endIdx };
  }

  private extractTaskSnippet(content: string, filePath: string, taskId: string): CodeSnippet[] {
    const lines = content.split('\n');
    const startIdx = this.findLineIndex(
      lines,
      (line, idx) =>
        line.includes('@task') &&
        (lines[idx + 1]?.includes(`def ${taskId}`) || lines[idx + 2]?.includes(`def ${taskId}`)),
    );
    if (startIdx === -1) return [];

    const { start, end } = this.getIndentedBlock(lines, startIdx);
    return [{ path: filePath, snippet: lines.slice(start, end + 1).join('\n') }];
  }

  private extractOperatorSnippet(content: string, filePath: string, taskId: string): CodeSnippet[] {
    const lines = content.split('\n');
    const lineIdx = this.findLineIndex(
      lines,
      line =>
        line.includes(`task_id=["']${taskId}["']`) ||
        line.includes(`task_id = ["']${taskId}["']`),
    );
    if (lineIdx === -1) return [];
    return [{ path: filePath, snippet: lines[lineIdx].trim() }];
  }

  private extractOperatorSnippetByVar(content: string, filePath: string, varName: string): CodeSnippet[] {
    const lines = content.split('\n');
    const lineIdx = this.findLineIndex(
      lines,
      line => line.includes(`${varName} =`) && line.includes('Operator'),
    );
    if (lineIdx === -1) return [];
    return [{ path: filePath, snippet: lines[lineIdx].trim() }];
  }

  private async getAirflowCmd(cwd: string): Promise<{ commandInfo: CommandInfo; isLocal: boolean } | null> {
    if (this.airflowCmdCache.has(cwd)) {
      return this.airflowCmdCache.get(cwd)!;
    }

    let result = this.findVenvAirflow(cwd)
      ?? await this.findUvAirflow(cwd)
      ?? await this.findGlobalAirflow();

    this.airflowCmdCache.set(cwd, result);
    return result;
  }

  private findVenvAirflow(cwd: string): { commandInfo: CommandInfo; isLocal: boolean } | null {
    const isWindows = process.platform === 'win32';
    const venvDirs = ['.venv', 'venv', 'env'];

    for (const dir of venvDirs) {
      const venvAirflow = path.join(
        cwd,
        dir,
        isWindows ? 'Scripts' : 'bin',
        isWindows ? 'airflow.exe' : 'airflow',
      );
      if (fs.existsSync(venvAirflow)) {
        return { commandInfo: { command: venvAirflow, args: [] }, isLocal: true };
      }
    }
    return null;
  }

  private async findUvAirflow(cwd: string): Promise<{ commandInfo: CommandInfo; isLocal: boolean } | null> {
    try {
      await execPromise('uv --version');
      await execPromise('uv run airflow version', { cwd });
      return { commandInfo: { command: 'uv', args: ['run', 'airflow'] }, isLocal: false };
    } catch {
      return null;
    }
  }

  private async findGlobalAirflow(): Promise<{ commandInfo: CommandInfo; isLocal: boolean } | null> {
    try {
      await execPromise('airflow version');
      return { commandInfo: { command: 'airflow', args: [] }, isLocal: false };
    } catch {
      return null;
    }
  }
}
