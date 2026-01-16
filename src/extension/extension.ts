import * as vscode from 'vscode';
import { PipelineWebviewProvider } from './WebviewProvider';
import { IPipeline } from './pipelines/IPipeline';
import { CICDPipeline } from './pipelines/CICDPipeline';
import { OrchestrationPipeline } from './pipelines/OrchestrationPipeline';
import { PipelineType } from '../shared/types';
import { IParser } from './parsers/IParser';

export function activate(context: vscode.ExtensionContext) {
    console.log('[Pipeline Visualizer] 🚀 Extension is activating...');

    const provider = new PipelineWebviewProvider(context.extensionUri);
    const pipelines: IPipeline[] = [new CICDPipeline(), new OrchestrationPipeline()];

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(PipelineWebviewProvider.viewType, provider)
    );
    console.log('[Pipeline Visualizer] ✅ Webview provider registered');

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
            console.error('[Pipeline Visualizer] ❌ Error in watchFiles:', error);
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
                console.error('[Pipeline Visualizer] ❌ Error during pipeline discovery:', error);
                provider.setLoading(false);
            });
        }
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('cicd.select', () => {
            provider.pipelineType = PipelineType.CICD;
            discover();
        }),
        vscode.commands.registerCommand('orchestration.select', () => {
            provider.pipelineType = PipelineType.Orchestration;
            discover();
        })
    );

    console.log('[Pipeline Visualizer] 🔍 Starting pipeline discovery...');
    discover();

    watchFiles();

    console.log('[Pipeline Visualizer] ✅ Extension activated successfully!');
}

async function discoverPipelines(provider: PipelineWebviewProvider, parsers: IParser[]) {
    const pipelinePatterns = {
        github: '**/.github/workflows/*.{yml,yaml}',
        gitlab: '**/.gitlab-ci.yml',
        airflow: '**/dags/*.py',
        kedro: '**/pipeline.py'
    };

    try {
        provider.setLoading(true);
        console.log('[Pipeline Visualizer] 🔍 Searching for pipeline files for category:', provider.pipelineType);

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
                        console.log(`[Pipeline Visualizer] ✅ Using parser: ${parser.name} for ${files[0].fsPath}`);
                        const data = parser.parse(content);
                        provider.updatePipeline(data);
                        // Stop after finding the first valid pipeline in the category
                        return;
                    }
                }
            } catch (innerError) {
                console.error(`[Pipeline Visualizer] ❌ Error discovering ${key} pipelines:`, innerError);
            }
        }
        console.log('[Pipeline Visualizer] ⚠️ No pipeline files found in workspace for the selected category');
    } finally {
        provider.setLoading(false);
    }
}

export function deactivate() { }
