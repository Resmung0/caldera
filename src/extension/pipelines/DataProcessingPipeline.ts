import { IPipeline } from "./IPipeline";
import { IParser } from "../parsers/IParser";
import { PipelineType } from "../../shared/types";
import { AirflowParser } from "../parsers/data-processing/AirflowParser";
import { KedroParser } from "../parsers/data-processing/KedroParser";

export class DataProcessingPipeline implements IPipeline {
  type: PipelineType = PipelineType.DataProcessing;
  parsers: IParser[] = [new AirflowParser(), new KedroParser()];
  patterns: string[] = [
    '**/dags/*.py',
    '**/pipeline.py',
  ];
}
