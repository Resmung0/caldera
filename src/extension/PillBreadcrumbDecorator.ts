import * as vscode from "vscode";
import { PipelineData, PipelineNode } from "../shared/types";

function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&"']/g, (c) => {
        switch (c) {
            case "<": return "&lt;";
            case ">": return "&gt;";
            case "&": return "&amp;";
            case '"': return "&quot;";
            case "'": return "&apos;";
            default: return c;
        }
    });
}

export function createPillSvgDataUri(index: number, label: string, isLast: boolean): string {
    const charWidth = 7.5;
    const indexWidth = 22;
    const labelClean = label.length > 20 ? label.substring(0, 18) + "…" : label;
    const textWidth = Math.max(36, labelClean.length * charWidth + 14);
    const totalWidth = indexWidth + textWidth;
    const height = 20;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth + (isLast ? 0 : 14)}" height="${height}" viewBox="0 0 ${totalWidth + (isLast ? 0 : 14)} ${height}">
      <g>
        <!-- Outer rounded rectangle -->
        <rect x="0.5" y="0.5" width="${totalWidth - 1}" height="${height - 1}" rx="4" fill="#181825" stroke="#7c3aed" stroke-width="1.2"/>
        <!-- Purple left block for index -->
        <path d="M 0.5 4.5 A 4 4 0 0 1 4.5 0.5 L ${indexWidth} 0.5 L ${indexWidth} ${height - 0.5} L 4.5 ${height - 0.5} A 4 4 0 0 1 0.5 ${height - 4.5} Z" fill="#7c3aed"/>
        <!-- Index text -->
        <text x="${indexWidth / 2}" y="14" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">${index}</text>
        <!-- Label text -->
        <text x="${indexWidth + textWidth / 2}" y="14" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" fill="#e2e8f0" text-anchor="middle">${escapeXml(labelClean)}</text>
      </g>
      ${!isLast ? `<text x="${totalWidth + 7}" y="14" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="bold" fill="#64748b" text-anchor="middle">&gt;</text>` : ""}
    </svg>`;

    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

export class PillBreadcrumbDecorator {
    private static decorationTypes: vscode.TextEditorDecorationType[] = [];

    public static updateDecorations(editor: vscode.TextEditor, data?: PipelineData) {
        this.clearDecorations(editor);

        if (!data || !data.nodes || data.nodes.length === 0) {
            return;
        }

        const sortedNodes = this.topologicalSort(data.nodes, data.edges);
        const range = new vscode.Range(0, 0, 0, 0);

        sortedNodes.forEach((node, idx) => {
            const isLast = idx === sortedNodes.length - 1;
            const svgUri = createPillSvgDataUri(idx + 1, node.label, isLast);

            const decType = vscode.window.createTextEditorDecorationType({
                before: {
                    contentIconPath: vscode.Uri.parse(svgUri),
                    margin: "0 4px 6px 0",
                },
            });

            this.decorationTypes.push(decType);
            editor.setDecorations(decType, [range]);
        });
    }

    public static clearDecorations(editor?: vscode.TextEditor) {
        this.decorationTypes.forEach(d => {
            if (editor) {
                editor.setDecorations(d, []);
            }
            d.dispose();
        });
        this.decorationTypes = [];
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
