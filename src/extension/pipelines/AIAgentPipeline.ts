import { IPipeline, ParserWithPatterns } from "./IPipeline";
import { PipelinePatternType } from "../../shared/types";
import { LangChainParser } from "../parsers/ai-agent/LangChainParser";

export class AIAgentPipeline implements IPipeline {
  type: PipelinePatternType = PipelinePatternType.AI_AGENT;
  parsers: ParserWithPatterns[] = [
    Object.assign(new LangChainParser(), { patterns: ['**/chain.py'] }),
  ];
}
