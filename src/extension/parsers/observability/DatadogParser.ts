import { IParser } from "../IParser";
import { PipelineData } from "../../../shared/types";

export class DatadogParser implements IParser {
  name = "Datadog";

  canParse(fileName: string, content: string): boolean {
    // Basic check, can be improved
    return content.includes("datadog");
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
