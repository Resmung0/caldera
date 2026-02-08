import { IPipeline, ParserWithPatterns } from "./IPipeline";
import { PipelinePatternType } from "../../shared/types";
import { UiPathParser } from "../parsers/rpa/UiPathParser";

export class RPAPipeline implements IPipeline {
  type: PipelinePatternType = PipelinePatternType.RPA;
  parsers: ParserWithPatterns[] = [
    Object.assign(new UiPathParser(), { patterns: ['**/*.xaml'] }),
  ];
}
