import { IPipeline } from "./IPipeline";
import { IParser } from "../parsers/IParser";
import { PipelineType } from "../../shared/types";
import { SnykParser } from "../parsers/security/SnykParser";

export class SecurityPipeline implements IPipeline {
  type: PipelineType = PipelineType.Security;
  parsers: IParser[] = [new SnykParser()];
}
