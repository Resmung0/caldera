import { IParser } from "../IParser";
import { PipelineData } from "../../../shared/types";

export class UiPathParser implements IParser {
  name = "UiPath";

  canParse(fileName: string, content: string): boolean {
    // Basic check, can be improved
    return fileName.endsWith(".xaml");
  }

  async parse(content: string, filePath: string): Promise<PipelineData> {
    // Placeholder implementation
    return {
      filePath,
      framework: this.name,
      nodes: [],
      edges: [],
    };
  }
}
