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

  /**
   * Split Python function arguments safely by respecting nested brackets/parentheses.
   */
  private splitArgs(argList: string): string[] {
    const args: string[] = [];
    let current = "";
    let depth = 0;

    for (let i = 0; i < argList.length; i++) {
        const char = argList[i];
        if (char === '[' || char === '(' || char === '{') depth++;
        if (char === ']' || char === ')' || char === '}') depth--;

        if (char === ',' && depth === 0) {
            args.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    if (current.trim()) {
        args.push(current.trim());
    }
    return args;
  }

  private isSimpleDagsterSignature(argList: string): boolean {
    // We now allow brackets for type hints like List[str]
    // but still guard against nested parentheses or braces which might indicate complex defaults
    const hasNestedComplex =
      argList.includes('(') ||
      argList.includes(')') ||
      argList.includes('{') ||
      argList.includes('}');

    if (hasNestedComplex) {
      return false;
    }

    if (argList.length > 500) { // Increased limit slightly
      return false;
    }

    return true;
  }

  async parse(content: string, filePath: string): Promise<PipelineData> {
    const nodes: PipelineNode[] = [];
    const edges: PipelineEdge[] = [];
    const nodeIds = new Set<string>();

    // Improved regex to handle multiline and multiple decorators
    // Matches @asset/op followed by optional arguments, then any number of other decorators/comments, then the def
    const decoratorRegex = /@(asset|op|graph_asset|multi_asset)(?:\(([\s\S]*?)\))?(?:\s*@\w+(?:\([\s\S]*?\))?|\s*#.*|\s+)*\s+def\s+(\w+)\s*\(([\s\S]*?)\)/g;

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

            // Use smarter splitter
            const args = this.splitArgs(funcArgs)
                .map(arg => arg.trim())
                .filter(arg => arg && !arg.startsWith('*'))
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
                    const deps = this.splitArgs(depsMatch[1])
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
