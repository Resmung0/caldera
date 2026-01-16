import { IPipeline } from "./IPipeline";
import { IParser } from "../parsers/IParser";
import { PipelineType } from "../../shared/types";
import { DatadogParser } from "../parsers/observability/DatadogParser";

export class ObservabilityPipeline implements IPipeline {
  type: PipelineType = PipelineType.Observability;
  parsers: IParser[] = [new DatadogParser()];
}
