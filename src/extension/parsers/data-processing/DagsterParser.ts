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

  private isSimpleDagsterSignature(argList: string): boolean {
    const hasNestedParens =
      argList.includes('(') ||
      argList.includes(')') ||
      argList.includes('{') ||
      argList.includes('}');
    if (hasNestedParens) {
      return false;
    }

    if (argList.length > 200) {
      return false;
    }

    return true;
  }

  async parse(content: string, filePath: string): Promise<PipelineData> {
    const nodes: PipelineNode[] = [];
    const edges: PipelineEdge[] = [];
    const nodeIds = new Set<string>();

    const decoratorRegex = /@(asset|op|graph_asset|multi_asset)(?:\(([\s\S]*?)\))?\s+def\s+(\w+)\s*\(([\s\S]*?)\)/g;

    let match;
    while ((match = decoratorRegex.exec(content)) !== null) {
        const [fullMatch, type, decArgs, name, funcArgs] = match;

        if (!this.isSimpleDagsterSignature(funcArgs)) {
            continue;
        }

        const id = name;

        if (!nodeIds.has(id)) {
            const isAsset = type.includes('asset');
            nodes.push({
                id,
                label: id,
                type: isAsset ? 'artifact' : 'default',
                data: {
                    framework: this.name,
                    dataType: isAsset ? 'asset' : 'op'
                }
            });
            nodeIds.add(id);

            const args = funcArgs.split(',')
                .map(arg => arg.trim())
                .filter(arg => arg && !arg.startsWith('*')) // Ignore *args and **kwargs
                .map(arg => {
                    return arg.split(/[=:]/)[0].trim();
                })
                .filter(arg => {
                    return arg && arg !== 'context' && arg !== '/';
                });

            for (const arg of args) {
                edges.push({
                    id: `e-${arg}-${id}`,
                    source: arg,
                    target: id
                });
            }

            if (decArgs) {
                const depsMatch = decArgs.match(/deps\s*=\s*\[([\s\S]*?)\]/);
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

    const definedNodes = new Set(nodes.map(n => n.id));
    const externalNodes: PipelineNode[] = [];
    const finalEdges: PipelineEdge[] = [];
    const edgeIds = new Set<string>();

    for (const edge of edges) {
        if (!edgeIds.has(edge.id)) {
            finalEdges.push(edge);
            edgeIds.add(edge.id);
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
    }

    nodes.push(...externalNodes);

    return {
      filePath,
      framework: this.name,
      nodes,
      edges: finalEdges,
    };
  }
}
