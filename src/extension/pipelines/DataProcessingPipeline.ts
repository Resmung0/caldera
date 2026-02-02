import { IPipeline, ParserWithPatterns } from "./IPipeline";
import { PipelineType } from "../../shared/types";
import { AirflowParser } from "../parsers/data-processing/AirflowParser";
import { KedroParser } from "../parsers/data-processing/KedroParser";
import { DVCParser } from "../parsers/data-processing/DVCParser";

export class DataProcessingPipeline implements IPipeline {
  type: PipelineType = PipelineType.DataProcessing;
  parsers: ParserWithPatterns[] = [
    Object.assign(new AirflowParser(), { patterns: ['**/dags/*.py'] }),
    Object.assign(new KedroParser(), { patterns: ['**/src/**/pipeline.py', '**/src/**/pipelines/**/pipeline.py'] }),
    Object.assign(new DVCParser(), { patterns: ['**/dvc.yaml', '**/dvc.yml'] }),
  ];
}
