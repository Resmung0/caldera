import { IPipeline } from "./IPipeline";
import { IParser } from "../parsers/IParser";
import { PipelineType } from "../../shared/types";
import { LangChainParser } from "../parsers/ai-agent/LangChainParser";

export class AIAgentPipeline implements IPipeline {
  type: PipelineType = PipelineType.AIAgent;
  parsers: IParser[] = [new LangChainParser()];
  patterns: string[] = [
    '**/*.py', // For LangChain, could be more specific
  ];
}
