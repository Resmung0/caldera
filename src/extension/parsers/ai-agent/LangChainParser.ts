import { IParser } from "../IParser";
import { PipelineData } from "../../../shared/types";

export class LangChainParser implements IParser {
  name = "LangChain";

  canParse(fileName: string, content: string): boolean {
    // Basic check, can be improved
    return content.includes("from langchain");
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
