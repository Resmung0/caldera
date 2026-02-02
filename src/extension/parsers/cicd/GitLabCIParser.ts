import { IParser } from "../IParser";
import { PipelineData } from "../../../shared/types";

export class GitLabCIParser implements IParser {
  name = "GitLab CI";

  canParse(fileName: string, content: string): boolean {
    return fileName.endsWith(".gitlab-ci.yml");
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
