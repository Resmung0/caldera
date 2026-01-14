import * as vscode from 'vscode';
import { PipelineWebviewProvider } from './WebviewProvider';
import { GitHubActionsParser } from './parsers/GitHubActionsParser';
import { IParser } from './parsers/IParser';

export function activate(context: vscode.ExtensionContext) {
    const provider = new PipelineWebviewProvider(context.extensionUri);
    const parsers: IParser[] = [new GitHubActionsParser()];

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

    // Inicializar se houver um editor aberto
    watchFiles();
}

export function deactivate() {}
