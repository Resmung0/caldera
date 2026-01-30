import * as vscode from 'vscode';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { IParser } from '../IParser';
import { PipelineData, PipelineNode, PipelineEdge } from '../../../shared/types';

const execPromise = promisify(exec);
const execFilePromise = promisify(execFile);

export interface CommandInfo {
    command: string;
    args: string[];
}

export class DVCParser implements IParser {
    name = 'DVC';
    private dvcCmdCache = new Map<string, CommandInfo>();

    canParse(fileName: string, content: string): boolean {
        const lowerName = fileName.toLowerCase();
        return lowerName.endsWith('dvc.yaml') || lowerName.endsWith('dvc.yml');
    }

    async parse(content: string, filePath: string): Promise<PipelineData> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
        const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : path.dirname(filePath);

        const dvcCmdInfo = await this.getDVCCmd(cwd);

        if (!dvcCmdInfo) {
            vscode.window.showWarningMessage(
                "If you are trying to view a DVC pipeline, you need to have the DVC CLI available in your environment."
            );
            return {
                filePath,
                framework: this.name,
                nodes: [],
                edges: []
            };
        }

        try {
            // Using --mermaid as it's easier to parse than ASCII
            const { stdout } = await this.execDvcDagMermaid(dvcCmdInfo, cwd);
            return this.parseMermaid(stdout, filePath);
        } catch (error) {
            console.error('Failed to parse DVC pipeline using CLI:', error);
            return {
                filePath,
                framework: this.name,
                nodes: [],
                edges: []
            };
        }
    }

    private async execDvcDagMermaid(dvcCmdInfo: CommandInfo, cwd: string) {
        const fullArgs = [...dvcCmdInfo.args, 'dag', '--mermaid'];
        return execFilePromise(dvcCmdInfo.command, fullArgs, { cwd });
    }

    private parseMermaid(mermaid: string, filePath: string): PipelineData {
        const nodes: PipelineNode[] = [];
        const edges: PipelineEdge[] = [];

        // Example node: 	node1["node1"]
        // Loosened to allow more characters in ID and label
        const nodeRegex = /^\s*([^\s\[]+)\["(.*)"\]/gm;
        // Example edge: 	node1 --> node2
        const edgeRegex = /^\s*([^\s-]+)\s*-->\s*([^\s]+)/gm;

        let match;
        while ((match = nodeRegex.exec(mermaid)) !== null) {
            nodes.push({
                id: match[1],
                label: match[2],
                type: 'default'
            });
        }

        while ((match = edgeRegex.exec(mermaid)) !== null) {
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

    private async getDVCCmd(cwd: string): Promise<CommandInfo | null> {
        if (this.dvcCmdCache.has(cwd)) {
            return this.dvcCmdCache.get(cwd)!;
        }

        const isWindows = process.platform === 'win32';

        // 1. Check local virtual environment
        const venvPaths = [
            path.join(cwd, '.venv', isWindows ? 'Scripts' : 'bin', isWindows ? 'dvc.exe' : 'dvc'),
            path.join(cwd, 'venv', isWindows ? 'Scripts' : 'bin', isWindows ? 'dvc.exe' : 'dvc'),
            path.join(cwd, 'env', isWindows ? 'Scripts' : 'bin', isWindows ? 'dvc.exe' : 'dvc'),
        ];

        let result: CommandInfo | null = null;

        for (const venvDvc of venvPaths) {
            if (fs.existsSync(venvDvc)) {
                result = { command: venvDvc, args: [] };
                break;
            }
        }

        if (!result) {
            // 2. Check uv
            try {
                await execPromise('uv --version');
                await execPromise('uv run dvc --version', { cwd });
                result = { command: 'uv', args: ['run', 'dvc'] };
            } catch {}
        }

        if (!result) {
            // 3. Check pipx
            try {
                await execPromise('pipx --version');
                await execPromise('pipx run dvc --version');
                result = { command: 'pipx', args: ['run', 'dvc'] };
            } catch {}
        }

        if (!result) {
            // 4. Check global dvc
            try {
                await execPromise('dvc --version');
                result = { command: 'dvc', args: [] };
            } catch {}
        }

        if (result) {
            this.dvcCmdCache.set(cwd, result);
        }
        return result;
    }
}
