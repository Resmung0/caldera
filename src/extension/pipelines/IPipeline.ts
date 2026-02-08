import { IParser } from "../parsers/IParser";
import { PipelinePatternType } from "../../shared/types";

export interface ParserWithPatterns extends IParser {
  patterns: string[];
}

export interface IPipeline {
  type: PipelinePatternType;
  parsers: ParserWithPatterns[];
}
