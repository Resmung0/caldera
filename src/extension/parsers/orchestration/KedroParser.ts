import { IParser } from "../IParser";
import { PipelineData } from "../../../shared/types";

export class KedroParser implements IParser {
  name = "Kedro";

  canParse(fileName: string, content: string): boolean {
    // Basic check, can be improved
    return content.includes("create_pipeline");
  }

  parse(content: string): PipelineData {
    // Placeholder implementation
    return {
      framework: this.name,
      nodes: [],
      edges: [],
    };
  }
}
