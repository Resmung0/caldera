import { IPipeline, ParserWithPatterns } from "./IPipeline";
import { PipelineType } from "../../shared/types";
import { LangChainParser } from "../parsers/ai-agent/LangChainParser";

export class AIAgentPipeline implements IPipeline {
  type: PipelineType = PipelineType.AIAgent;
  parsers: ParserWithPatterns[] = [
    Object.assign(new LangChainParser(), { patterns: ['**/chain.py'] }),
  ];
}
