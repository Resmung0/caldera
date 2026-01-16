import { IParser } from "../IParser";
import { PipelineData } from "../../../shared/types";

export class AirflowParser implements IParser {
  name = "Airflow";

  canParse(fileName: string, content: string): boolean {
    // Basic check, can be improved
    return content.includes("from airflow import DAG");
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
