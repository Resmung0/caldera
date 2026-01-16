import * as vscode from 'vscode';
import { PipelineData } from '../shared/types';

export class PipelineWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'pipeline.view';
    private _view?: vscode.WebviewView;

    // Cache the latest data to send when webview opens
    private _cachedPipelineData?: PipelineData;
    private _isLoading: boolean = false;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log('[Pipeline Visualizer] 🎨 Webview panel opened');
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Listen for messages from the webview (Handshake)
        webviewView.webview.onDidReceiveMessage(message => {
            console.log('[Pipeline Visualizer] 📨 Received message from webview:', message);

            if (message.type === 'webviewReady') {
                console.log('[Pipeline Visualizer] 🤝 Handshake complete! Sending cached data...');

                if (this._isLoading) {
                    this.setLoading(true);
                }
                if (this._cachedPipelineData) {
                    console.log('[Pipeline Visualizer] 📤 Sending cached pipeline data now.');
                    this._view?.webview.postMessage({ type: 'updatePipeline', data: this._cachedPipelineData });
                } else {
                    console.log('[Pipeline Visualizer] ⚠️ No cached data to send yet.');
                }
            }
        });
    }

    public updatePipeline(data: PipelineData) {
        // Always cache the data
        this._cachedPipelineData = data;

        if (this._view) {
            console.log('[Pipeline Visualizer] 📤 Sending pipeline data to webview');
            this._view.webview.postMessage({ type: 'updatePipeline', data });
        } else {
            console.log('[Pipeline Visualizer] 💾 Webview not open, data cached for later');
        }
    }

    public setLoading(isLoading: boolean) {
        this._isLoading = isLoading;

        if (this._view) {
            this._view.webview.postMessage({ type: 'setLoading', isLoading });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist-webview', 'assets', 'index.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist-webview', 'assets', 'index.css'));

        console.log('[Pipeline Visualizer] 📦 Loading webview assets:', { scriptUri: scriptUri.toString(), styleUri: styleUri.toString() });

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};">
                <link rel="stylesheet" href="${styleUri}">
                <title>Pipeline Visualizer</title>
            </head>
            <body>
                <div id="root"></div>
                <script type="module" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}
