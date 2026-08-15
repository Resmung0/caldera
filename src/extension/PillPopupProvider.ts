import * as vscode from "vscode";
import { PipelineData, PipelineNode } from "../shared/types";

export class PillPopupProvider {
    private static statusBarItem: vscode.StatusBarItem | undefined;

    public static updateStatusBarItem(data?: PipelineData) {
        if (!this.statusBarItem) {
            this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
            this.statusBarItem.command = "caldera.showPipelinePillView";
        }

        if (data && data.nodes && data.nodes.length > 0) {
            const count = data.nodes.length;
            const name = data.framework || "Pipeline";
            this.statusBarItem.text = `$(symbol-structure) ${count} | ${name}`;
            this.statusBarItem.tooltip = `Click to view ${name} pipeline steps (${data.filePath})`;
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }

    public static async showQuickPickPopup(data: PipelineData) {
        const quickPick = vscode.window.createQuickPick();

        const pathParts = data.filePath.split(/[\\/]/);
        const fileName = pathParts[pathParts.length - 1] || "File";
        const nodeCount = data.nodes.length;

        quickPick.title = `$(symbol-structure) [ ${nodeCount} | ${data.framework || "Pipeline"} ] - ${fileName}`;
        quickPick.placeholder = "Search pipeline steps... (Select to jump to line in editor)";

        // Build parents and children maps
        const parentsMap: Record<string, string[]> = {};
        const childrenMap: Record<string, string[]> = {};
        data.nodes.forEach(n => {
            parentsMap[n.id] = [];
            childrenMap[n.id] = [];
        });
        data.edges.forEach(e => {
            if (childrenMap[e.source]) childrenMap[e.source].push(e.target);
            if (parentsMap[e.target]) parentsMap[e.target].push(e.source);
        });

        // Topological Sort
        const sortedNodes = this.topologicalSort(data.nodes, data.edges);

        quickPick.items = sortedNodes.map(node => {
            const parents = (parentsMap[node.id] || []).map(id => {
                const n = data.nodes.find(item => item.id === id);
                return n ? n.label : id;
            });
            const children = (childrenMap[node.id] || []).map(id => {
                const n = data.nodes.find(item => item.id === id);
                return n ? n.label : id;
            });

            let icon = "$(circle-outline)";
            if (node.status === "success") icon = "$(check)";
            else if (node.status === "failed") icon = "$(error)";
            else if (node.status === "running") icon = "$(sync~spin)";
            else if (node.status === "idle") icon = "$(circle-filled)";

            let depText = "";
            if (parents.length > 0) depText += ` ← Parents: [${parents.join(", ")}]`;
            if (children.length > 0) depText += ` → Children: [${children.join(", ")}]`;

            return {
                label: `${icon} ${node.label}`,
                description: node.type ? `[${node.type}]` : "",
                detail: depText ? depText : "No dependencies",
                node: node
            } as vscode.QuickPickItem & { node: PipelineNode };
        });

        quickPick.onDidAccept(() => {
            const selected = quickPick.selectedItems[0] as (vscode.QuickPickItem & { node: PipelineNode });
            if (selected) {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor) {
                    const text = activeEditor.document.getText();
                    const lines = text.split("\n");
                    const targetLabel = selected.node.label.toLowerCase();
                    const targetId = selected.node.id.toLowerCase();

                    let foundLine = -1;
                    for (let i = 0; i < lines.length; i++) {
                        const l = lines[i].toLowerCase();
                        if (l.includes(targetLabel) || l.includes(targetId)) {
                            foundLine = i;
                            break;
                        }
                    }

                    if (foundLine !== -1) {
                        const position = new vscode.Position(foundLine, 0);
                        activeEditor.selection = new vscode.Selection(position, position);
                        activeEditor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
                    }
                }
            }
            quickPick.hide();
        });

        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();
    }

    private static topologicalSort(nodes: PipelineNode[], edges: any[]): PipelineNode[] {
        const sorted: string[] = [];
        const visited: Record<string, boolean> = {};
        const visiting: Record<string, boolean> = {};
        const adj: Record<string, string[]> = {};

        nodes.forEach(n => adj[n.id] = []);
        edges.forEach(e => {
            if (adj[e.source]) {
                adj[e.source].push(e.target);
            }
        });

        function visit(nodeId: string) {
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

        const sortedNodes = sorted.map(id => nodes.find(n => n.id === id)).filter(Boolean) as PipelineNode[];
        const missed = nodes.filter(n => !sorted.includes(n.id));
        return [...sortedNodes, ...missed];
    }
}
