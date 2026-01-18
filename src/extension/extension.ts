import * as vscode from 'vscode';
import { PipelineWebviewProvider } from './WebviewProvider';
import { IPipeline } from './pipelines/IPipeline';
import { CICDPipeline } from './pipelines/CICDPipeline';
import { DataProcessingPipeline } from './pipelines/DataProcessingPipeline';
import { AIAgentPipeline } from './pipelines/AIAgentPipeline';
import { RPAPipeline } from './pipelines/RPAPipeline';
import { PipelineType } from '../shared/types';
import { IParser } from './parsers/IParser';
import { LOG_PREFIX } from './constants';

export function activate(context: vscode.ExtensionContext) {
    console.log(`${LOG_PREFIX} 🚀 Extension is activating...`);

    const provider = new PipelineWebviewProvider(context.extensionUri);
    const pipelines: IPipeline[] = [
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
                    const parser = pipeline.parsers.find(p => p.canParse(fileName, content));
                    if (parser) {
                        const data = parser.parse(content, fileName);
                        // We need to re-discover to get the full list of available pipelines
                        discoverPipelines(provider, pipeline.parsers, fileName);
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
            discoverPipelines(provider, pipeline.parsers, targetFile).catch(error => {
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
        vscode.commands.registerCommand('cicd.select', () => {
            provider.pipelineType = PipelineType.CICD;
            discover();
        }),
        vscode.commands.registerCommand('data-processing.select', () => {
            provider.pipelineType = PipelineType.DataProcessing;
            discover();
        }),
        vscode.commands.registerCommand('ai-agent.select', () => {
            provider.pipelineType = PipelineType.AIAgent;
            discover();
        }),
        vscode.commands.registerCommand('rpa.select', () => {
            provider.pipelineType = PipelineType.RPA;
            discover();
        })
    );

    console.log(`${LOG_PREFIX} 🔍 Starting pipeline discovery...`);
    discover();

    watchFiles();

    console.log(`${LOG_PREFIX} ✅ Extension activated successfully!`);
}

async function discoverPipelines(provider: PipelineWebviewProvider, parsers: IParser[], targetFile?: string) {
    provider.setLoading(true);
    console.log(`${LOG_PREFIX} 🔍 Discovering pipelines. Target: ${targetFile || 'All'}`);

    const allPipelineFiles: string[] = [];
    const pipelinePatterns = [
        '**/.github/workflows/*.yml',
        '**/.github/workflows/*.yaml',
        '**/.gitlab-ci.yml',
        '**/dags/*.py',
        '**/pipeline.py',
        '**/*.py', // For LangChain, could be more specific
        '**/*.xaml', // For UiPath
    ];

    // Find files using individual patterns to avoid nested brace issues
    const filePromises = pipelinePatterns.map(pattern => 
        vscode.workspace.findFiles(pattern, '**/node_modules/**')
    );
    const fileArrays = await Promise.all(filePromises);
    const files = fileArrays.flat();
    files.forEach(file => allPipelineFiles.push(file.fsPath));

    if (allPipelineFiles.length === 0) {
        console.log(`${LOG_PREFIX} ⚠️ No pipeline files found.`);
        provider.setLoading(false);
        return;
    }

    const fileToParse = targetFile && allPipelineFiles.includes(targetFile)
        ? vscode.Uri.file(targetFile)
        : files[0];

    try {
        const document = await vscode.workspace.openTextDocument(fileToParse);
        const content = document.getText();
        const parser = parsers.find(p => p.canParse(fileToParse.fsPath, content));

        if (parser) {
            console.log(`${LOG_PREFIX} ✅ Parsing ${fileToParse.fsPath} with ${parser.name}`);
            const data = parser.parse(content, fileToParse.fsPath);
            provider.updatePipeline(data, allPipelineFiles);
        } else {
            console.log(`${LOG_PREFIX} ❓ No suitable parser for ${fileToParse.fsPath}`);
        }
    } catch (error) {
        console.error(`${LOG_PREFIX} ❌ Error parsing ${fileToParse.fsPath}:`, error);
    } finally {
        provider.setLoading(false);
    }
}

export function deactivate() { }
