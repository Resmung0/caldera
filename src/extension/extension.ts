import * as vscode from 'vscode';
import { PipelineWebviewProvider } from './WebviewProvider';
import { GitHubActionsParser } from './parsers/GitHubActionsParser';

import { IParser } from './parsers/IParser';

export function activate(context: vscode.ExtensionContext) {
    console.log('[Pipeline Visualizer] 🚀 Extension is activating...');

    const provider = new PipelineWebviewProvider(context.extensionUri);
    const parsers: IParser[] = [new GitHubActionsParser()];

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

                const parser = parsers.find(p => p.canParse(fileName, content));
                if (parser) {
                    const data = parser.parse(content);
                    provider.updatePipeline(data);
                }
            }
        } catch (error) {
            console.error('[Pipeline Visualizer] ❌ Error in watchFiles:', error);
        }
    };

    // Monitorar mudanças no arquivo ativo
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(() => watchFiles()),
        vscode.window.onDidChangeActiveTextEditor(() => watchFiles())
    );

    // Inicializar Auto-Discovery (runs in background, errors are caught internally)
    console.log('[Pipeline Visualizer] 🔍 Starting pipeline discovery...');
    discoverPipelines(provider, parsers).catch(error => {
        console.error('[Pipeline Visualizer] ❌ Error during pipeline discovery:', error);
        provider.setLoading(false);
    });

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
        console.log('[Pipeline Visualizer] 🔍 Searching for pipeline files...');

        for (const [key, pattern] of Object.entries(pipelinePatterns)) {
            try {
                console.log(`[Pipeline Visualizer] 📂 Searching pattern: ${pattern}`);
                const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 1);
                console.log(`[Pipeline Visualizer] 📂 Found ${files.length} files for ${key}`);

                if (files.length > 0) {
                    console.log(`[Pipeline Visualizer] 📄 Opening file: ${files[0].fsPath}`);
                    const document = await vscode.workspace.openTextDocument(files[0]);
                    const content = document.getText();
                    const parser = parsers.find(p => p.canParse(files[0].fsPath, content));

                    if (parser) {
                        console.log(`[Pipeline Visualizer] ✅ Using parser: ${parser.name}`);
                        const data = parser.parse(content);
                        console.log(`[Pipeline Visualizer] 📊 Parsed data:`, JSON.stringify(data, null, 2));
                        provider.updatePipeline(data);
                        provider.setLoading(false);
                        console.log('[Pipeline Visualizer] ✅ Pipeline data sent to webview!');
                        return;
                    } else {
                        console.log(`[Pipeline Visualizer] ⚠️ No parser found for file: ${files[0].fsPath}`);
                    }
                }
            } catch (innerError) {
                console.error(`[Pipeline Visualizer] ❌ Error discovering ${key} pipelines:`, innerError);
            }
        }
        console.log('[Pipeline Visualizer] ⚠️ No pipeline files found in workspace');
    } finally {
        provider.setLoading(false);
    }
}

export function deactivate() { }
