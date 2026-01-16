import { IParser } from "../IParser";
import { PipelineData } from "../../../shared/types";

export class SnykParser implements IParser {
  name = "Snyk";

  canParse(fileName: string, content: string): boolean {
    // Basic check, can be improved
    return content.includes("snyk");
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
