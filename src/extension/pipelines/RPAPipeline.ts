import { IPipeline, ParserWithPatterns } from "./IPipeline";
import { PipelineType } from "../../shared/types";
import { UiPathParser } from "../parsers/rpa/UiPathParser";

export class RPAPipeline implements IPipeline {
  type: PipelineType = PipelineType.RPA;
  parsers: ParserWithPatterns[] = [
    Object.assign(new UiPathParser(), { patterns: ['**/*.xaml'] }),
  ];
}
