import * as vscode from 'vscode';
import { PipelineData, PipelineType } from '../shared/types';
import { LOG_PREFIX } from './constants';

export class PipelineWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'pipeline.view';
    private _view?: vscode.WebviewView;

    // Cache the latest data to send when webview opens
    private _cachedPipelineData?: PipelineData;
    private _isLoading: boolean = false;
    public pipelineType: PipelineType = PipelineType.CICD;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log(`${LOG_PREFIX} 🎨 Webview panel opened`);
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Listen for messages from the webview (Handshake)
        webviewView.webview.onDidReceiveMessage(message => {
            console.log(`${LOG_PREFIX} 📨 Received message from webview:`, message);

            if (message.type === 'webviewReady') {
                console.log(`${LOG_PREFIX} 🤝 Handshake complete! Sending cached data...`);

                if (this._isLoading) {
                    this.setLoading(true);
                }
                if (this._cachedPipelineData) {
                    console.log(`${LOG_PREFIX} 📤 Sending cached pipeline data now.`);
                    this._view?.webview.postMessage({ type: 'updatePipeline', data: this._cachedPipelineData });
                } else {
                    console.log(`${LOG_PREFIX} ⚠️ No cached data to send yet.`);
                }
            }
        });
    }

    public updatePipeline(data: PipelineData) {
        // Always cache the data
        this._cachedPipelineData = data;

        if (this._view) {
            console.log(`${LOG_PREFIX} 📤 Sending pipeline data to webview`);
            this._view.webview.postMessage({ type: 'updatePipeline', data });
        } else {
            console.log(`${LOG_PREFIX} 💾 Webview not open, data cached for later`);
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

        console.log(`${LOG_PREFIX} 📦 Loading webview assets:`, { scriptUri: scriptUri.toString(), styleUri: styleUri.toString() });

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
