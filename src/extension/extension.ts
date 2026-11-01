import * as vscode from 'vscode';
import { PipelineWebviewProvider } from './WebviewProvider';

import { IPipeline } from './pipelines/IPipeline';
import { ParserWithPatterns } from './pipelines/IPipeline';
import { CICDPipeline } from './pipelines/CICDPipeline';
import { DataProcessingPipeline } from './pipelines/DataProcessingPipeline';
import { AIAgentPipeline } from './pipelines/AIAgentPipeline';
import { RPAPipeline } from './pipelines/RPAPipeline';
import { PipelineData, PipelinePatternType } from '../shared/types';
import { LOG_PREFIX } from './constants';

const PIPELINE_DISCOVERY_EXCLUDE_GLOB =
    '**/{node_modules,.venv,venv,env,.env,virtualenv,ENV,.tox,site-packages}/**';

export function activate(context: vscode.ExtensionContext) {
    console.log(`${LOG_PREFIX} 🚀 Extension is activating...`);

    const provider = new PipelineWebviewProvider(context.extensionUri);
    // Allow DataProcessingPipeline to omit 'patterns' property
    const pipelines: (IPipeline | Omit<IPipeline, 'patterns'>)[] = [
        new CICDPipeline(),
        new DataProcessingPipeline(),
        new AIAgentPipeline(),
        new RPAPipeline(),
    ];

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(PipelineWebviewProvider.viewType, provider)
    );
    console.log(`${LOG_PREFIX} ✅ Webview provider registered`);

    const watchFiles = () => {
        try {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const fileName = activeEditor.document.fileName;
                const content = activeEditor.document.getText();
                const pipeline = pipelines.find(p => p.type === provider.pipelineType);
                if (pipeline) {
                    const parser = pipeline.parsers.find((p: any) => p.canParse(fileName, content));
                    if (parser) {
                        // Trigger discovery if the file can be parsed
                        discoverPipelines(provider, pipeline as any, fileName);
                    }
                }
            }
        } catch (error) {
            console.error(`${LOG_PREFIX} ❌ Error in watchFiles:`, error);
        }
    };

    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(() => watchFiles()),
        vscode.window.onDidChangeActiveTextEditor(() => watchFiles())
    );

    const discover = (targetFile?: string) => {
        const pipeline = pipelines.find(p => p.type === provider.pipelineType);
        if (pipeline) {
            discoverPipelines(provider, pipeline as any, targetFile).catch(error => {
                console.error(`${LOG_PREFIX} ❌ Error during pipeline discovery:`, error);
                provider.setLoading(false);
            });
        }
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('caldera.visualizePipeline', (filePath: string) => {
            discover(filePath);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('caldera.selectCategory', (category: string) => {
            if (Object.values(PipelinePatternType).includes(category as PipelinePatternType)) {
                provider.pipelineType = category as PipelinePatternType;
                discover();
            } else {
                console.error(`${LOG_PREFIX} ❌ Invalid category received: ${category}`);
            }
        })
    );

    console.log(`${LOG_PREFIX} 🔍 Starting pipeline discovery...`);
    watchFiles();
    console.log(`${LOG_PREFIX} ✅ Extension activated successfully!`);
}

export async function discoverPipelines(provider: PipelineWebviewProvider, pipeline: IPipeline, targetFile?: string) {
    provider.setLoading(true);
    console.log(`${LOG_PREFIX} 🔍 Discovering pipelines for category ${pipeline.type}. Target: ${targetFile || 'All'}`);

    try {
        const parserPatterns = pipeline.parsers as ParserWithPatterns[];
        const fileArrays = await Promise.all(
            parserPatterns.flatMap((parser) =>
                parser.patterns.map((pattern) =>
                    vscode.workspace.findFiles(pattern, PIPELINE_DISCOVERY_EXCLUDE_GLOB)
                )
            )
        );
        const candidateFiles = Array.from(
            new Map(fileArrays.flat().map((file) => [file.fsPath, file])).values()
        ).sort((left, right) => left.fsPath.localeCompare(right.fsPath));
        const discoveredFiles: { file: vscode.Uri; data: PipelineData }[] = [];

        for (let index = 0; index < candidateFiles.length; index += 20) {
            const batch = candidateFiles.slice(index, index + 20);
            const results = await Promise.all(batch.map(async (file) => {
                const document = await vscode.workspace.openTextDocument(file);
                const content = document.getText();
                const parser = parserPatterns.find((candidate) =>
                    candidate.canParse(file.fsPath, content)
                );
                if (!parser) return undefined;
                return { file, parser, content };
            }));

            for (const result of results) {
                if (!result) continue;
                console.log(`${LOG_PREFIX} ✅ Parsing ${result.file.fsPath} with ${result.parser.name}`);
                discoveredFiles.push({
                    file: result.file,
                    data: await result.parser.parse(result.content, result.file.fsPath),
                });
            }
        }

        const availablePipelines = discoveredFiles.map(({ file }) => file.fsPath);
        const filesToDisplay = targetFile
            ? discoveredFiles.filter(({ file }) => file.fsPath === targetFile)
            : discoveredFiles;
        const nodes: PipelineData['nodes'] = [];
        const edges: PipelineData['edges'] = [];

        for (const { file, data } of filesToDisplay) {
            const nodeIds = new Map(data.nodes.map((node) => [node.id, `${file.fsPath}::${node.id}`]));
            nodes.push(...data.nodes.map((node) => ({
                ...node,
                id: nodeIds.get(node.id)!,
                data: node.data && {
                    ...node.data,
                    prefectTaskIds: node.data.prefectTaskIds?.map((id: string) => nodeIds.get(id) ?? id),
                    prefectFlowIds: node.data.prefectFlowIds?.map((id: string) => nodeIds.get(id) ?? id),
                    prefectChildFlowIds: node.data.prefectChildFlowIds?.map(
                        (id: string) => nodeIds.get(id) ?? id
                    ),
                    prefectTasks: node.data.prefectTasks?.map((task: {
                        id: string;
                        dependencies: string[];
                    }) => ({
                        ...task,
                        id: nodeIds.get(task.id) ?? task.id,
                        dependencies: task.dependencies.map((id: string) => nodeIds.get(id) ?? id),
                    })),
                },
            })));
            edges.push(...data.edges.map((edge) => ({
                ...edge,
                id: `${file.fsPath}::${edge.id}`,
                source: `${file.fsPath}::${edge.source}`,
                target: `${file.fsPath}::${edge.target}`,
            })));
        }

        const frameworks = Array.from(new Set(filesToDisplay.map(({ data }) => data.framework)));
        if (availablePipelines.length === 0) {
            console.log(`${LOG_PREFIX} ⚠️ No pipeline files found for category ${pipeline.type}.`);
        }
        provider.updatePipeline({
            filePath: targetFile ?? '',
            framework: frameworks.join(', '),
            nodes,
            edges,
            category: pipeline.type,
            tools: pipeline.parsers.map((parser) => parser.name),
        }, availablePipelines);
    } catch (error) {
        console.error(`${LOG_PREFIX} ❌ Error during pipeline discovery:`, error);
    } finally {
        provider.setLoading(false);
    }
}

export function deactivate() { }
