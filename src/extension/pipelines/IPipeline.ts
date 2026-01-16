import { IParser } from "../parsers/IParser";
import { PipelineType } from "../../shared/types";

export interface IPipeline {
  type: PipelineType;
  parsers: IParser[];
}
