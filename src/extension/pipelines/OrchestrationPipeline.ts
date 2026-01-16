import { IPipeline } from "./IPipeline";
import { IParser } from "../parsers/IParser";
import { PipelineType } from "../../shared/types";
import { AirflowParser } from "../parsers/orchestration/AirflowParser";
import { KedroParser } from "../parsers/orchestration/KedroParser";

export class OrchestrationPipeline implements IPipeline {
  type: PipelineType = PipelineType.Orchestration;
  parsers: IParser[] = [new AirflowParser(), new KedroParser()];
}
