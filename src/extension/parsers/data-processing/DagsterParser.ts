import { IParser } from "../IParser";
import { PipelineData, PipelineNode, PipelineEdge } from "../../../shared/types";

export class DagsterParser implements IParser {
  name = "Dagster";

  canParse(fileName: string, content: string): boolean {
    const lowerContent = content.toLowerCase();
    return (
      lowerContent.includes("from dagster import") ||
      lowerContent.includes("import dagster") ||
      lowerContent.includes("@asset") ||
      lowerContent.includes("@op") ||
      lowerContent.includes("definitions(")
    );
  }

  async parse(content: string, filePath: string): Promise<PipelineData> {
    const nodes: PipelineNode[] = [];
    const edges: PipelineEdge[] = [];
    const nodeIds = new Set<string>();

    // 1. Extract Assets and Ops from decorators
    // Matches @asset, @op, @graph_asset, @multi_asset
    // Captures the decorator body and the function definition
    const decoratorRegex = /@(asset|op|graph_asset|multi_asset)(\([^)]*\))?\s+def\s+(\w+)\s*\(([^)]*)\)/g;

    let match;
    while ((match = decoratorRegex.exec(content)) !== null) {
        const [fullMatch, type, decArgs, name, funcArgs] = match;
        const id = name;

        if (!nodeIds.has(id)) {
            const isAsset = type.includes('asset');
            nodes.push({
                id,
                label: id,
                type: isAsset ? 'artifact' : 'default',
                data: {
                    framework: this.name,
                    dataType: isAsset ? 'asset' : 'op',
                    // We could potentially extract metadata from decArgs here
                }
            });
            nodeIds.add(id);

            // A. Dependencies from function arguments (Software-Defined Assets style)
            const args = funcArgs.split(',')
                .map(arg => arg.trim().split(':')[0].trim()) // Handle type hints
                .filter(arg => arg && arg !== 'context' && !arg.startsWith('*'));

            for (const arg of args) {
                edges.push({
                    id: `e-${arg}-${id}`,
                    source: arg,
                    target: id
                });
            }

            // B. Dependencies from 'deps' argument in decorator
            // e.g. @asset(deps=["upstream_asset"])
            if (decArgs) {
                const depsMatch = decArgs.match(/deps\s*=\s*\[([^\]]+)\]/);
                if (depsMatch) {
                    const deps = depsMatch[1].split(',')
                        .map(d => d.trim().replace(/['"()]/g, '').replace(/^AssetKey/, ''))
                        .filter(d => d);
                    for (const dep of deps) {
                        edges.push({
                            id: `e-${dep}-${id}`,
                            source: dep,
                            target: id
                        });
                    }
                }
            }
        }
    }

    // 2. Identify external assets (dependencies that are not defined in this file)
    const definedNodes = new Set(nodes.map(n => n.id));
    const externalNodes: PipelineNode[] = [];

    for (const edge of edges) {
        if (!definedNodes.has(edge.source)) {
            externalNodes.push({
                id: edge.source,
                label: edge.source,
                type: 'artifact',
                data: { framework: this.name, dataType: 'external-asset' }
            });
            definedNodes.add(edge.source);
        }
    }

    nodes.push(...externalNodes);

    return {
      filePath,
      framework: this.name,
      nodes,
      edges,
    };
  }
}
