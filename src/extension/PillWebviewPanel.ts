import * as vscode from "vscode";
import { PipelineData } from "../shared/types";

export class PillWebviewPanel {
    public static currentPanel: PillWebviewPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, data: PipelineData) {
        // If we already have a panel, show it.
        if (PillWebviewPanel.currentPanel) {
            PillWebviewPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside, true);
            PillWebviewPanel.currentPanel.update(data);
            return;
        }

        // Otherwise, create a new panel beside the active editor without stealing focus.
        const panel = vscode.window.createWebviewPanel(
            "pipelinePillView",
            "Pipeline Pill View",
            { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true,
            }
        );

        PillWebviewPanel.currentPanel = new PillWebviewPanel(panel, extensionUri, data);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, data: PipelineData) {
        this._panel = panel;

        // Set the webviews initial html content
        this._updateHtml(data);

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content based on view state changes
        this._panel.onDidChangeViewState(
            e => {
                if (this._panel.visible) {
                    this.update(data);
                }
            },
            null,
            this._disposables
        );
    }

    public update(data: PipelineData) {
        // Send a message to the webview.
        this._panel.webview.postMessage({ type: "update", data });
    }

    public dispose() {
        PillWebviewPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _updateHtml(data: PipelineData) {
        this._panel.webview.html = this._getHtmlForWebview(data);
    }

    private _getHtmlForWebview(data: PipelineData): string {
        const title = "Caldera - Pill View";

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        :root {
            --color-success: #10b981;
            --color-failed: #ef4444;
            --color-running: #2563eb;
            --color-idle: #64748b;
        }
        body {
            background-color: var(--vscode-editor-background, #1e1e1e);
            color: var(--vscode-editor-foreground, #d4d4d4);
            font-family: var(--vscode-editor-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
            padding: 16px;
            margin: 0;
            font-size: 13px;
            line-height: 1.4;
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
            padding-bottom: 12px;
            margin-bottom: 16px;
        }
        .header-title-container {
            display: flex;
            flex-direction: column;
            gap: 4px;
            max-width: 70%;
        }
        .file-name {
            font-weight: 600;
            font-size: 14px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: var(--vscode-editor-foreground);
        }
        .file-path {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .framework-badge {
            background-color: var(--vscode-badge-background, #4d4d4d);
            color: var(--vscode-badge-foreground, #ffffff);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: bold;
            letter-spacing: 0.5px;
            white-space: nowrap;
        }
        .search-container {
            margin-bottom: 16px;
            position: relative;
        }
        .search-input {
            width: 100%;
            background-color: var(--vscode-input-background, #3c3c3c);
            color: var(--vscode-input-foreground, #cccccc);
            border: 1px solid var(--vscode-input-border, #3c3c3c);
            padding: 8px 12px;
            padding-right: 30px;
            border-radius: 6px;
            font-size: 12px;
            box-sizing: border-box;
            outline: none;
            transition: border-color 0.15s ease;
        }
        .search-input:focus {
            border-color: var(--vscode-focusBorder, #007fd4);
        }
        .clear-search {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
            display: none;
            user-select: none;
        }
        .legend {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            background: rgba(128,128,128,0.05);
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px dashed rgba(128,128,128,0.15);
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .pills-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .pill-card {
            background-color: var(--vscode-editor-inactiveSelectionBackground, rgba(128,128,128,0.05));
            border: 1px solid var(--vscode-panel-border, #3c3c3c);
            border-radius: 10px;
            padding: 10px 14px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
        }
        .pill-card:hover {
            border-color: var(--vscode-focusBorder, #007fd4);
            background-color: var(--vscode-list-hoverBackground, rgba(128,128,128,0.1));
        }
        .pill-card.highlight-self {
            border-color: var(--vscode-focusBorder, #007fd4);
            box-shadow: 0 0 10px rgba(0, 127, 212, 0.4);
            background-color: var(--vscode-list-activeSelectionBackground, rgba(0, 127, 212, 0.1));
        }
        .pill-card.highlight-parent {
            border-color: var(--color-running);
            box-shadow: 0 0 8px rgba(37, 99, 235, 0.3);
        }
        .pill-card.highlight-child {
            border-color: var(--color-success);
            box-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
        }
        .pill-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .pill-title-row {
            display: flex;
            align-items: center;
            gap: 8px;
            max-width: 80%;
        }
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .status-dot.success { background-color: var(--color-success); }
        .status-dot.failed { background-color: var(--color-failed); }
        .status-dot.idle { background-color: var(--color-idle); }
        .status-dot.running {
            background-color: var(--color-running);
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7);
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% {
                transform: scale(0.95);
                box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7);
            }
            70% {
                transform: scale(1);
                box-shadow: 0 0 0 5px rgba(37, 99, 235, 0);
            }
            100% {
                transform: scale(0.95);
                box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
            }
        }
        .pill-label {
            font-weight: 550;
            font-size: 12.5px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .pill-type {
            font-size: 9px;
            color: var(--vscode-descriptionForeground);
            background-color: rgba(128,128,128,0.12);
            padding: 1px 6px;
            border-radius: 8px;
            font-family: monospace;
        }
        .dep-section {
            display: flex;
            flex-direction: column;
            gap: 3px;
            margin-top: 2px;
            padding-top: 4px;
            border-top: 1px dashed rgba(128,128,128,0.1);
        }
        .dep-row {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 10px;
        }
        .dep-label {
            color: var(--vscode-descriptionForeground);
            width: 55px;
            flex-shrink: 0;
        }
        .dep-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }
        .dep-badge {
            background-color: rgba(128,128,128,0.08);
            border: 1px solid rgba(128,128,128,0.15);
            color: var(--vscode-editor-foreground);
            padding: 1px 6px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .dep-badge:hover {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-color: transparent;
        }
        .no-results {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding: 40px 20px;
        }
        .no-results-icon {
            font-size: 24px;
            margin-bottom: 8px;
            opacity: 0.5;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-title-container">
            <div class="file-name" id="fileName">...</div>
            <div class="file-path" id="filePath">...</div>
        </div>
        <span class="framework-badge" id="framework">...</span>
    </div>

    <div class="search-container">
        <input type="text" class="search-input" id="searchInput" placeholder="Search pipeline nodes..." />
        <span class="clear-search" id="clearSearch">&times;</span>
    </div>

    <div class="legend">
        <div class="legend-item"><span class="status-dot success"></span> Success</div>
        <div class="legend-item"><span class="status-dot running"></span> Running</div>
        <div class="legend-item"><span class="status-dot failed"></span> Failed</div>
        <div class="legend-item"><span class="status-dot idle"></span> Idle</div>
    </div>

    <div class="pills-container" id="pillsContainer">
        <!-- Rendered dynamically -->
    </div>

    <script>
        let currentData = ${JSON.stringify(data)};

        const fileNameEl = document.getElementById("fileName");
        const filePathEl = document.getElementById("filePath");
        const frameworkEl = document.getElementById("framework");
        const searchInput = document.getElementById("searchInput");
        const clearSearch = document.getElementById("clearSearch");
        const pillsContainer = document.getElementById("pillsContainer");

        let activeHighlightNodeId = null;

        // Topological Sort
        function topologicalSort(nodes, edges) {
            const sorted = [];
            const visited = {};
            const visiting = {};
            const adj = {};

            nodes.forEach(n => adj[n.id] = []);
            edges.forEach(e => {
                if (adj[e.source]) {
                    adj[e.source].push(e.target);
                }
            });

            function visit(nodeId) {
                if (visiting[nodeId] || visited[nodeId]) return;

                visiting[nodeId] = true;
                const neighbors = adj[nodeId] || [];
                neighbors.forEach(neigh => visit(neigh));

                visiting[nodeId] = false;
                visited[nodeId] = true;
                sorted.unshift(nodeId);
            }

            nodes.forEach(n => {
                if (!visited[n.id]) visit(n.id);
            });

            const sortedNodes = sorted.map(id => nodes.find(n => n.id === id)).filter(Boolean);
            const missed = nodes.filter(n => !sorted.includes(n.id));
            return [...sortedNodes, ...missed];
        }

        function renderPipeline(data) {
            currentData = data;

            // Set header info
            const pathParts = data.filePath.split(/[\\/]/);
            const name = pathParts[pathParts.length - 1] || "No File";
            fileNameEl.textContent = name;
            filePathEl.textContent = data.filePath || "";
            filePathEl.title = data.filePath || "";
            frameworkEl.textContent = data.framework || "Unknown";

            const query = searchInput.value.toLowerCase().trim();
            if (query) {
                clearSearch.style.display = "block";
            } else {
                clearSearch.style.display = "none";
            }

            // Filter nodes
            const filteredNodes = data.nodes.filter(n => {
                const labelMatch = n.label.toLowerCase().includes(query);
                const typeMatch = (n.type || "").toLowerCase().includes(query);
                const statusMatch = (n.status || "idle").toLowerCase().includes(query);
                return labelMatch || typeMatch || statusMatch;
            });

            if (filteredNodes.length === 0) {
                pillsContainer.innerHTML = \`
                    <div class="no-results">
                        <div class="no-results-icon">🔍</div>
                        <div>No nodes found matching your search</div>
                    </div>
                \`;
                return;
            }

            // Build parents & children maps
            const parentsMap = {};
            const childrenMap = {};
            data.nodes.forEach(n => {
                parentsMap[n.id] = [];
                childrenMap[n.id] = [];
            });
            data.edges.forEach(e => {
                if (childrenMap[e.source]) childrenMap[e.source].push(e.target);
                if (parentsMap[e.target]) parentsMap[e.target].push(e.source);
            });

            // Sort filtered nodes topologically
            const sortedAll = topologicalSort(data.nodes, data.edges);
            const sortedFiltered = sortedAll.filter(n => filteredNodes.some(fn => fn.id === n.id));

            pillsContainer.innerHTML = "";
            sortedFiltered.forEach(node => {
                const nodeParents = parentsMap[node.id] || [];
                const nodeChildren = childrenMap[node.id] || [];

                const nodeCard = document.createElement("div");
                nodeCard.className = "pill-card";
                nodeCard.id = "node-" + node.id;
                nodeCard.setAttribute("data-node-id", node.id);

                // Add highlight classes based on active state
                if (activeHighlightNodeId) {
                    if (activeHighlightNodeId === node.id) {
                        nodeCard.classList.add("highlight-self");
                    } else if (parentsMap[activeHighlightNodeId].includes(node.id)) {
                        nodeCard.classList.add("highlight-parent");
                    } else if (childrenMap[activeHighlightNodeId].includes(node.id)) {
                        nodeCard.classList.add("highlight-child");
                    }
                }

                // Render badge structure
                let depsHtml = "";
                if (nodeParents.length > 0 || nodeChildren.length > 0) {
                    depsHtml += "<div class=\"dep-section\">";
                    if (nodeParents.length > 0) {
                        depsHtml += \`
                            <div class="dep-row">
                                <span class="dep-label">Parents:</span>
                                <div class="dep-badges">
                                    \${nodeParents.map(pId => {
                                        const pNode = data.nodes.find(n => n.id === pId);
                                        const pLabel = pNode ? pNode.label : pId;
                                        return \`<span class="dep-badge" data-target-id="\${pId}">\${pLabel}</span>\`;
                                    }).join("")}
                                </div>
                            </div>
                        \`;
                    }
                    if (nodeChildren.length > 0) {
                        depsHtml += \`
                            <div class="dep-row">
                                <span class="dep-label">Children:</span>
                                <div class="dep-badges">
                                    \${nodeChildren.map(cId => {
                                        const cNode = data.nodes.find(n => n.id === cId);
                                        const cLabel = cNode ? cNode.label : cId;
                                        return \`<span class="dep-badge" data-target-id="\${cId}">\${cLabel}</span>\`;
                                    }).join("")}
                                </div>
                            </div>
                        \`;
                    }
                    depsHtml += "</div>";
                }

                const status = node.status || "idle";
                nodeCard.innerHTML = \`
                    <div class="pill-header">
                        <div class="pill-title-row">
                            <span class="status-dot \${status}" title="\${status}"></span>
                            <span class="pill-label" title="\${node.label}">\${node.label}</span>
                        </div>
                        \${node.type ? \`<span class="pill-type">\${node.type}</span>\` : ""}
                    </div>
                    \${depsHtml}
                \`;

                // Card Click Handler (Toggle Highlight)
                nodeCard.addEventListener("click", (e) => {
                    if (e.target.classList.contains("dep-badge")) {
                        const targetId = e.target.getAttribute("data-target-id");
                        const targetEl = document.getElementById("node-" + targetId);
                        if (targetEl) {
                            targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
                            activeHighlightNodeId = targetId;
                            renderPipeline(currentData);
                        }
                        return;
                    }

                    if (activeHighlightNodeId === node.id) {
                        activeHighlightNodeId = null;
                    } else {
                        activeHighlightNodeId = node.id;
                    }
                    renderPipeline(currentData);
                });

                pillsContainer.appendChild(nodeCard);
            });
        }

        searchInput.addEventListener("input", () => {
            renderPipeline(currentData);
        });

        clearSearch.addEventListener("click", () => {
            searchInput.value = "";
            renderPipeline(currentData);
            searchInput.focus();
        });

        window.addEventListener("message", event => {
            const message = event.data;
            if (message.type === "update") {
                renderPipeline(message.data);
            }
        });

        renderPipeline(currentData);
    </script>
</body>
</html>`;
    }
}
