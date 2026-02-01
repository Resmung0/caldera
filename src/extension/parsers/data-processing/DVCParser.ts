import * as vscode from 'vscode';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
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
    private dvcCmdCache = new Map<string, { commandInfo: CommandInfo, isLocal: boolean }>();

    canParse(fileName: string, content: string): boolean {
        const lowerName = fileName.toLowerCase();
        return lowerName.endsWith('dvc.yaml') || lowerName.endsWith('dvc.yml');
    }

    async parse(content: string, filePath: string): Promise<PipelineData> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
        const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : path.dirname(filePath);

        const { commandInfo: dvcCmdInfo, isLocal } = await this.getDVCCmd(cwd);

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

        if (!isLocal) {
            vscode.window.showWarningMessage(
                "DVC needs to be installed inside the environment and not globally for the extension to understand DVC pipelines."
            );
        }

        try {
            // Using --mermaid as it's easier to parse than ASCII
            const { stdout } = await this.execDvcDagMermaid(dvcCmdInfo, cwd);
            return this.parseEnhanced(stdout, filePath, dvcCmdInfo, cwd);
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

    private async getParamsValues(dvcCmdInfo: CommandInfo, cwd: string): Promise<any> {
        let command = 'python3';
        let args = ['-c', "import dvc.api; import json; print(json.dumps(dvc.api.params_show()))"];

        if (dvcCmdInfo.command.endsWith('dvc') || dvcCmdInfo.command.endsWith('dvc.exe')) {
            const binDir = path.dirname(dvcCmdInfo.command);
            const venvPython = path.join(binDir, process.platform === 'win32' ? 'python.exe' : 'python');
            if (fs.existsSync(venvPython)) {
                command = venvPython;
            }
        } else if (dvcCmdInfo.command === 'uv') {
            command = 'uv';
            args = ['run', 'python', ...args];
        }

        try {
            const { stdout } = await execFilePromise(command, args, { cwd });
            return JSON.parse(stdout);
        } catch (error) {
            console.error('Failed to get DVC params:', error);
            return {};
        }
    }

    private getLockFileData(cwd: string): any {
        const lockFilePath = path.join(cwd, 'dvc.lock');
        if (fs.existsSync(lockFilePath)) {
            try {
                const content = fs.readFileSync(lockFilePath, 'utf8');
                return yaml.load(content);
            } catch (error) {
                console.error('Failed to parse dvc.lock:', error);
            }
        }
        return null;
    }

    private categorizeDep(filePath: string): 'code' | 'data' | 'other' {
        const ext = path.extname(filePath).toLowerCase();
        if (['.py', '.sh', '.r', '.jl', '.pl', '.rb'].includes(ext)) {
            return 'code';
        }
        if (['.csv', '.tsv', '.parquet', '.json', '.txt', '.xml', '.yaml', '.yml'].includes(ext)) {
            return 'data';
        }
        return 'other';
    }

    private readFileSnippet(filePath: string, cwd: string): string {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
        if (fs.existsSync(fullPath)) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                return content.split('\n').slice(0, 10).join('\n'); // First 10 lines
            } catch (error) {
                console.error(`Failed to read file ${filePath}:`, error);
            }
        }
        return '';
    }

    private listFolderContents(folderPath: string, cwd: string): string[] {
        const fullPath = path.isAbsolute(folderPath) ? folderPath : path.join(cwd, folderPath);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
            try {
                return fs.readdirSync(fullPath).slice(0, 5); // Limit to 5 items for display
            } catch (error) {
                console.error(`Failed to list folder ${folderPath}:`, error);
            }
        }
        return [];
    }

    private async parseEnhanced(mermaid: string, filePath: string, dvcCmdInfo: CommandInfo, cwd: string): Promise<PipelineData> {
        const nodes: PipelineNode[] = [];
        const edges: PipelineEdge[] = [];
        const lockData = this.getLockFileData(cwd);
        const paramsData = await this.getParamsValues(dvcCmdInfo, cwd);

        // Map to keep track of outputs and who produced them
        const outputToProducer = new Map<string, string>();
        const stageToOutputs = new Map<string, string[]>();
        const stageToDeps = new Map<string, string[]>();

        if (lockData && lockData.stages) {
            for (const [stageName, stageData] of Object.entries<any>(lockData.stages)) {
                if (stageData.outs) {
                    const outs = stageData.outs.map((o: any) => o.path);
                    stageToOutputs.set(stageName, outs);
                    outs.forEach((out: string) => outputToProducer.set(out, stageName));
                }
                if (stageData.deps) {
                    const deps = stageData.deps.map((d: any) => d.path);
                    stageToDeps.set(stageName, deps);
                }
            }
        }

        const nodeRegex = /^\s*([^\s\[]+)\["(.*)"\]/gm;
        const edgeRegex = /^\s*([^\s-]+)\s*-->\s*([^\s]+)/gm;

        let match;
        const processedStages = new Set<string>();

        while ((match = nodeRegex.exec(mermaid)) !== null) {
            const id = match[1];
            const label = match[2];
            processedStages.add(label);

            const isArtifact = label.toLowerCase().endsWith('.dvc');

            if (isArtifact) {
                const baseName = label.slice(0, -4);
                const extMatch = baseName.match(/\.([^.]+)$/);
                let dataType = 'file';
                if (extMatch) {
                    const ext = extMatch[1].toLowerCase();
                    if (['png', 'tiff', 'jpg', 'jpeg'].includes(ext)) {
                        dataType = 'image';
                    } else if (['csv', 'tsv', 'parquet', 'feather', 'xlsx', 'xml'].includes(ext)) {
                        dataType = 'table';
                    } else if (['mp4', 'mov', 'mkv'].includes(ext)) {
                        dataType = 'video';
                    } else if (['mp3', 'ogg', 'aac', 'opus', 'wav'].includes(ext)) {
                        dataType = 'audio';
                    }
                }

                nodes.push({
                    id,
                    label,
                    type: 'artifact',
                    data: {
                        framework: this.name,
                        dataType
                    }
                });
            } else {
                const stageDeps = stageToDeps.get(label) || [];
                const codeDeps = stageDeps
                    .filter(d => this.categorizeDep(d) === 'code')
                    .map(d => ({ path: d, snippet: this.readFileSnippet(d, cwd) }));

                const stageParams = paramsData[label] || paramsData;

                nodes.push({
                    id,
                    label,
                    type: 'default',
                    data: {
                        framework: this.name,
                        codeDeps,
                        params: stageParams
                    }
                });
            }

            // Add artifact nodes for outputs
            const stageOuts = stageToOutputs.get(label) || [];
            stageOuts.forEach((out, index) => {
                const artifactId = `art-${id}-${index}`;
                const isFolder = !path.extname(out);

                let dataType = isFolder ? 'folder' : 'file';
                if (!isFolder) {
                    const extMatch = out.match(/\.([^.]+)$/);
                    if (extMatch) {
                        const ext = extMatch[1].toLowerCase();
                        if (['png', 'tiff', 'jpg', 'jpeg'].includes(ext)) {
                            dataType = 'image';
                        } else if (['csv', 'tsv', 'parquet', 'feather', 'xlsx', 'xml'].includes(ext)) {
                            dataType = 'table';
                        } else if (['mp4', 'mov', 'mkv'].includes(ext)) {
                            dataType = 'video';
                        } else if (['mp3', 'ogg', 'aac', 'opus', 'wav'].includes(ext)) {
                            dataType = 'audio';
                        }
                    }
                }

                nodes.push({
                    id: artifactId,
                    label: out,
                    type: 'artifact',
                    data: {
                        dataType,
                        contents: isFolder ? this.listFolderContents(out, cwd) : undefined
                    }
                });

                edges.push({
                    id: `e-${id}-${artifactId}`,
                    source: id,
                    target: artifactId
                });
            });
        }

        while ((match = edgeRegex.exec(mermaid)) !== null) {
            const sourceId = match[1];
            const targetId = match[2];

            // Find labels
            const sourceNode = nodes.find(n => n.id === sourceId);
            const targetNode = nodes.find(n => n.id === targetId);

            if (sourceNode && targetNode) {
                const sourceLabel = sourceNode.label;
                const targetLabel = targetNode.label;

                // Check if there's an artifact that connects them
                const outputs = stageToOutputs.get(sourceLabel) || [];
                const inputs = stageToDeps.get(targetLabel) || [];
                const common = outputs.filter(o => inputs.includes(o));

                if (common.length > 0) {
                    // Link artifact to target stage
                    common.forEach(out => {
                        const artifactNode = nodes.find(n => n.label === out && n.type === 'artifact' && edges.some(e => e.source === sourceId && e.target === n.id));
                        if (artifactNode) {
                            edges.push({
                                id: `e-${artifactNode.id}-${targetId}`,
                                source: artifactNode.id,
                                target: targetId
                            });
                        }
                    });
                } else {
                    // Fallback to direct edge if no common artifact found (might be code dep or something else)
                    edges.push({
                        id: `e-${sourceId}-${targetId}`,
                        source: sourceId,
                        target: targetId
                    });
                }
            }
        }

        return {
            filePath,
            framework: this.name,
            nodes,
            edges
        };
    }

    private async getDVCCmd(cwd: string): Promise<{ commandInfo: CommandInfo | null, isLocal: boolean }> {
        if (this.dvcCmdCache.has(cwd)) {
            return this.dvcCmdCache.get(cwd)!;
        }

        const isWindows = process.platform === 'win32';

        // 1. Check local virtual environment
        const venvDirs = ['.venv', 'venv', 'env'];
        const venvPaths: string[] = [];
        for (const dir of venvDirs) {
            venvPaths.push(
                path.join(cwd, dir, isWindows ? 'Scripts' : 'bin', isWindows ? 'dvc.exe' : 'dvc')
            );
        }

        let commandInfo: CommandInfo | null = null;
        let isLocal = false;

        for (const venvDvc of venvPaths) {
            if (fs.existsSync(venvDvc)) {
                commandInfo = { command: venvDvc, args: [] };
                isLocal = true;
                break;
            }
        }

        if (!commandInfo) {
            // 2. Check uv
            try {
                await execPromise('uv --version');
                await execPromise('uv run dvc --version', { cwd });
                commandInfo = { command: 'uv', args: ['run', 'dvc'] };
            } catch { }
        }

        if (!commandInfo) {
            // 3. Check pipx
            try {
                await execPromise('pipx --version');
                await execPromise('pipx run dvc --version');
                commandInfo = { command: 'pipx', args: ['run', 'dvc'] };
            } catch { }
        }

        if (!commandInfo) {
            // 4. Check global dvc
            try {
                await execPromise('dvc --version');
                commandInfo = { command: 'dvc', args: [] };
            } catch { }
        }

        const result = { commandInfo, isLocal };
        if (commandInfo) {
            // Only cache if commandInfo is not null, and type matches cache type
            this.dvcCmdCache.set(cwd, { commandInfo, isLocal });
        }
        return result;
    }
}
