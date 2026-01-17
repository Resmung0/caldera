import { IParser } from "../IParser";
import { PipelineData } from "../../../shared/types";

export class UiPathParser implements IParser {
  name = "UiPath";

  canParse(fileName: string, content: string): boolean {
    // Basic check, can be improved
    return fileName.endsWith(".xaml");
  }

  parse(content: string, filePath: string): PipelineData {
    // Placeholder implementation
    return {
      filePath,
      framework: this.name,
      nodes: [],
      edges: [],
    };
  }
}
