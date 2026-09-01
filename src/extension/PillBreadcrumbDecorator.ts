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
        <rect x="0.5" y="0.5" width="${totalWidth - 1}" height="${height - 1}" rx="4" fill="#181825" stroke="#f20d63" stroke-width="1.2"/>
        <!-- Pink left block for index -->
        <path d="M 0.5 4.5 A 4 4 0 0 1 4.5 0.5 L ${indexWidth} 0.5 L ${indexWidth} ${height - 0.5} L 4.5 ${height - 0.5} A 4 4 0 0 1 0.5 ${height - 4.5} Z" fill="#f20d63"/>
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
    private static decorations: { type: vscode.TextEditorDecorationType; hoverMessage: vscode.MarkdownString }[] = [];
    private static currentEditor?: vscode.TextEditor;
    private static currentSignature?: string;
    private static currentLine?: number;

    public static updateDecorations(editor: vscode.TextEditor, data?: PipelineData) {
        if (!data || !data.nodes || data.nodes.length === 0) {
            this.clearDecorations(editor);
            return;
        }

        const sortedNodes = this.topologicalSort(data.nodes, data.edges);
        const signature = this.createSignature(data, sortedNodes);

        // Sticky scroll: position decorations at top visible line
        const topVisibleLine = editor.visibleRanges[0]?.start.line || 0;
        const range = new vscode.Range(topVisibleLine, 0, topVisibleLine, 0);

        if (this.currentEditor !== editor || this.currentSignature !== signature) {
            this.rebuildDecorations(editor, sortedNodes, signature);
        } else if (this.currentLine === topVisibleLine) {
            return;
        }

        this.decorations.forEach(({ type, hoverMessage }) => {
            editor.setDecorations(type, [{ range, hoverMessage }]);
        });
        this.currentLine = topVisibleLine;
    }

    public static clearDecorations(editor?: vscode.TextEditor) {
        this.decorations.forEach(d => {
            if (editor) {
                editor.setDecorations(d.type, []);
            }
            d.type.dispose();
        });
        this.decorations = [];
        this.currentEditor = undefined;
        this.currentSignature = undefined;
        this.currentLine = undefined;
    }

    private static rebuildDecorations(
        editor: vscode.TextEditor,
        sortedNodes: PipelineNode[],
        signature: string
    ) {
        this.clearDecorations(editor);
        this.currentEditor = editor;
        this.currentSignature = signature;

        sortedNodes.forEach((node, idx) => {
            const isLast = idx === sortedNodes.length - 1;
            const svgUri = createPillSvgDataUri(idx + 1, node.label, isLast);

            // Interactive hover link to jump to code location
            const hoverMarkdown = new vscode.MarkdownString(
                `**Step ${idx + 1}: ${node.label}**\n\n` +
                `[$(arrow-right) Jump to Code](command:caldera.jumpToNode?${encodeURIComponent(JSON.stringify([node.id, node.label]))})`
            );
            hoverMarkdown.isTrusted = true;

            const decTypeOptions: vscode.DecorationRenderOptions = {
                before: {
                    contentIconPath: vscode.Uri.parse(svgUri),
                    margin: "0 4px 6px 0",
                },
            };

            // Line break after last pill decoration to prevent first code line from rendering beside it
            if (isLast) {
                decTypeOptions.after = {
                    contentText: "\n",
                };
            }

            const decType = vscode.window.createTextEditorDecorationType(decTypeOptions);

            this.decorations.push({ type: decType, hoverMessage: hoverMarkdown });
        });
    }

    private static createSignature(data: PipelineData, sortedNodes: PipelineNode[]): string {
        const nodeSignature = sortedNodes.map(node => `${node.id}:${node.label}`).join("|");
        const edgeSignature = data.edges.map(edge => `${edge.source}->${edge.target}`).sort().join("|");
        return `${data.filePath}|${data.framework}|${nodeSignature}|${edgeSignature}`;
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
