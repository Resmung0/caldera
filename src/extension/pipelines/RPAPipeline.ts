import { IPipeline } from "./IPipeline";
import { IParser } from "../parsers/IParser";
import { PipelineType } from "../../shared/types";
import { UiPathParser } from "../parsers/rpa/UiPathParser";

export class RPAPipeline implements IPipeline {
  type: PipelineType = PipelineType.RPA;
  parsers: IParser[] = [new UiPathParser()];
  patterns: string[] = [
    '**/*.xaml', // For UiPath
  ];
}
