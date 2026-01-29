import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { IParser } from '../IParser';
import { PipelineData, PipelineNode, PipelineEdge } from '../../../shared/types';

const execPromise = promisify(exec);

export class DVCParser implements IParser {
    name = 'DVC';

    canParse(fileName: string, content: string): boolean {
        return fileName.endsWith('dvc.yaml');
    }

    async parse(content: string, filePath: string): Promise<PipelineData> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
        const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : path.dirname(filePath);

        const dvcCmd = await this.getDVCCmd(cwd);

        if (!dvcCmd) {
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
            const { stdout } = await execPromise(`${dvcCmd} dag --mermaid`, { cwd });
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

    private parseMermaid(mermaid: string, filePath: string): PipelineData {
        const nodes: PipelineNode[] = [];
        const edges: PipelineEdge[] = [];

        // Example node: 	node1["node1"]
        const nodeRegex = /^\s*([\w-]+)\["(.*)"\]/gm;
        // Example edge: 	node1 --> node2
        const edgeRegex = /^\s*([\w-]+)\s*-->\s*([\w-]+)/gm;

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

    private async getDVCCmd(cwd: string): Promise<string | null> {
        const isWindows = process.platform === 'win32';

        // 1. Check local virtual environment
        const venvPaths = [
            path.join(cwd, '.venv', isWindows ? 'Scripts' : 'bin', isWindows ? 'dvc.exe' : 'dvc'),
            path.join(cwd, 'venv', isWindows ? 'Scripts' : 'bin', isWindows ? 'dvc.exe' : 'dvc'),
            path.join(cwd, 'env', isWindows ? 'Scripts' : 'bin', isWindows ? 'dvc.exe' : 'dvc'),
        ];

        for (const venvDvc of venvPaths) {
            if (fs.existsSync(venvDvc)) {
                return venvDvc;
            }
        }

        // 2. Check uv
        try {
            await execPromise('uv --version');
            // If uv exists, check if dvc is available through it
            await execPromise('uv run dvc --version', { cwd });
            return 'uv run dvc';
        } catch {}

        // 3. Check pipx
        try {
            await execPromise('pipx --version');
            await execPromise('pipx run dvc --version');
            return 'pipx run dvc';
        } catch {}

        // 4. Check global dvc
        try {
            await execPromise('dvc --version');
            return 'dvc';
        } catch {}

        return null;
    }
}
