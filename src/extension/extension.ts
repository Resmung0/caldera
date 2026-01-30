import * as vscode from 'vscode';
import { PipelineWebviewProvider } from './WebviewProvider';

import { IPipeline } from './pipelines/IPipeline';
import { ParserWithPatterns } from './pipelines/IPipeline';
import { CICDPipeline } from './pipelines/CICDPipeline';
import { DataProcessingPipeline } from './pipelines/DataProcessingPipeline';
import { AIAgentPipeline } from './pipelines/AIAgentPipeline';
import { RPAPipeline } from './pipelines/RPAPipeline';
import { PipelineType } from '../shared/types';
import { LOG_PREFIX } from './constants';

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
            if (Object.values(PipelineType).includes(category as PipelineType)) {
                provider.pipelineType = category as PipelineType;
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

async function discoverPipelines(provider: PipelineWebviewProvider, pipeline: IPipeline, targetFile?: string) {
    provider.setLoading(true);
    console.log(`${LOG_PREFIX} 🔍 Discovering pipelines for category ${pipeline.type}. Target: ${targetFile || 'All'}`);


    // Collect files for each parser and keep track of which parser matches which file
    const parserFiles: { parser: ParserWithPatterns, files: vscode.Uri[] }[] = [];
    for (const parser of (pipeline.parsers as ParserWithPatterns[])) {
        const foundArrays = await Promise.all(
            parser.patterns.map(pattern => vscode.workspace.findFiles(pattern, '**/node_modules/**'))
        );
        const foundFiles = foundArrays.flat();
        parserFiles.push({ parser, files: foundFiles });
    }

    // Flatten all files for the UI, but keep parser association for parsing
    const allPipelineFiles: string[] = Array.from(new Set(parserFiles.flatMap(pf => pf.files.map(f => f.fsPath))));

    if (allPipelineFiles.length === 0) {
        console.log(`${LOG_PREFIX} ⚠️ No pipeline files found for category ${pipeline.type}.`);
        provider.updatePipeline({
            filePath: '',
            framework: '',
            nodes: [],
            edges: [],
            category: pipeline.type,
            tools: pipeline.parsers.map(p => p.name),
        }, []);
        provider.setLoading(false);
        return;
    }

    // Pick the file to parse
    let fileToParseUri: vscode.Uri | undefined;
    if (targetFile && allPipelineFiles.includes(targetFile)) {
        fileToParseUri = vscode.Uri.file(targetFile);
    } else {
        // Pick the first file found
        fileToParseUri = parserFiles.find(pf => pf.files.length > 0)?.files[0];
    }

    if (!fileToParseUri) {
        provider.setLoading(false);
        return;
    }

    try {
        const document = await vscode.workspace.openTextDocument(fileToParseUri);
        const content = document.getText();
        // Find the parser that matches this file
        const parser = parserFiles.find(pf => pf.files.some(f => f.fsPath === fileToParseUri!.fsPath))?.parser;

        if (parser) {
            console.log(`${LOG_PREFIX} ✅ Parsing ${fileToParseUri.fsPath} with ${parser.name}`);
            const data = await parser.parse(content, fileToParseUri.fsPath);
            // Always set category to pipeline.type for correct webview highlight
            provider.updatePipeline({ ...data, category: pipeline.type }, allPipelineFiles);
        } else {
            console.log(`${LOG_PREFIX} ❓ No suitable parser for ${fileToParseUri.fsPath}`);
        }
    } catch (error) {
        console.error(`${LOG_PREFIX} ❌ Error parsing ${fileToParseUri.fsPath}:`, error);
    } finally {
        provider.setLoading(false);
    }
}

export function deactivate() { }
