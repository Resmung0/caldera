import * as vscode from 'vscode';
import { PipelineData } from '../shared/types';

export class PipelineWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'pipeline.view';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    }

    public updatePipeline(data: PipelineData) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'updatePipeline', data });
        }
    }

    public setLoading(isLoading: boolean) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'setLoading', isLoading });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Em produção, isso apontaria para os arquivos buildados pelo Vite
        // Para o scaffold, vamos usar um placeholder que será substituído pelo build real
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Pipeline Visualizer</title>
            </head>
            <body>
                <div id="root"></div>
                <script type="module" src="${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist-webview', 'assets', 'index.js'))}"></script>
            </body>
            </html>`;
    }
}
