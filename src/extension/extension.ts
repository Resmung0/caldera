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
                        const data = parser.parse(content);
                        provider.updatePipeline(data);
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

    const discover = () => {
        const pipeline = pipelines.find(p => p.type === provider.pipelineType);
        if (pipeline) {
            discoverPipelines(provider, pipeline.parsers).catch(error => {
                console.error(`${LOG_PREFIX} ❌ Error during pipeline discovery:`, error);
                provider.setLoading(false);
            });
        }
    };

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

async function discoverPipelines(provider: PipelineWebviewProvider, parsers: IParser[]) {
    const pipelinePatterns = {
        github: '**/.github/workflows/*.{yml,yaml}',
        gitlab: '**/.gitlab-ci.yml',
        airflow: '**/dags/*.py',
        kedro: '**/pipeline.py',
        langchain: '**/*.py',
        uipath: '**/*.xaml',
    };

    try {
        provider.setLoading(true);
        console.log(`${LOG_PREFIX} 🔍 Searching for pipeline files for category:`, provider.pipelineType);

        for (const [key, pattern] of Object.entries(pipelinePatterns)) {
            try {
                // Find up to 1 file for each pattern. We only visualize one at a time.
                const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 1);
                if (files.length > 0) {
                    const document = await vscode.workspace.openTextDocument(files[0]);
                    const content = document.getText();
                    // Find a parser that can handle this file
                    const parser = parsers.find(p => p.canParse(files[0].fsPath, content));

                    if (parser) {
                        console.log(`${LOG_PREFIX} ✅ Using parser: ${parser.name} for ${files[0].fsPath}`);
                        const data = parser.parse(content);
                        provider.updatePipeline(data);
                        // Stop after finding the first valid pipeline in the category
                        return;
                    }
                }
            } catch (innerError) {
                console.error(`${LOG_PREFIX} ❌ Error discovering ${key} pipelines:`, innerError);
            }
        }
        console.log(`${LOG_PREFIX} ⚠️ No pipeline files found in workspace for the selected category`);
    } finally {
        provider.setLoading(false);
    }
}

export function deactivate() { }
