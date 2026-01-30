import { IParser } from "../parsers/IParser";
import { PipelineType } from "../../shared/types";

export interface ParserWithPatterns extends IParser {
  patterns: string[];
}

export interface IPipeline {
  type: PipelineType;
  parsers: ParserWithPatterns[];
}
