import { IParser } from "../IParser";
import { PipelineData } from "../../../shared/types";

export class GitLabCIParser implements IParser {
  name = "GitLab CI";

  canParse(fileName: string, content: string): boolean {
    return fileName.endsWith(".gitlab-ci.yml");
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
