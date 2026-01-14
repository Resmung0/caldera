import * as vscode from 'vscode';
import { PipelineWebviewProvider } from './WebviewProvider';
import { GitHubActionsParser } from './parsers/GitHubActionsParser';
import { CustomParser } from './parsers/CustomParser';
import { IParser } from './parsers/IParser';

export function activate(context: vscode.ExtensionContext) {
    const provider = new PipelineWebviewProvider(context.extensionUri);
    const parsers: IParser[] = [new GitHubActionsParser(), new CustomParser()];

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(PipelineWebviewProvider.viewType, provider)
    );

    const watchFiles = () => {
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
    };

    // Monitorar mudanças no arquivo ativo
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(() => watchFiles()),
        vscode.window.onDidChangeActiveTextEditor(() => watchFiles())
    );

    // Inicializar Auto-Discovery
    discoverPipelines(provider, parsers);

    // Monitorar mudanças no arquivo ativo
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(() => watchFiles()),
        vscode.window.onDidChangeActiveTextEditor(() => watchFiles())
    );

    watchFiles();
}

async function discoverPipelines(provider: PipelineWebviewProvider, parsers: IParser[]) {
    const pipelinePatterns = {
        github: '**/.github/workflows/*.{yml,yaml}',
        gitlab: '**/.gitlab-ci.yml',
        airflow: '**/dags/*.py',
        kedro: '**/pipeline.py',
        custom: '**/caldera.json'
    };

    provider.setLoading(true);

    for (const [key, pattern] of Object.entries(pipelinePatterns)) {
        const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 1);
        if (files.length > 0) {
            const document = await vscode.workspace.openTextDocument(files[0]);
            const content = document.getText();
            const parser = parsers.find(p => p.canParse(files[0].fsPath, content));
            
            if (parser) {
                const data = parser.parse(content);
                provider.updatePipeline(data);
                provider.setLoading(false);
                return;
            }
        }
    }
    
    provider.setLoading(false);
}

export function deactivate() {}
