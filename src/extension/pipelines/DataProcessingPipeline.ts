import { IPipeline, ParserWithPatterns } from "./IPipeline";
import { PipelinePatternType } from "../../shared/types";
import { AirflowParser } from "../parsers/data-processing/AirflowParser";
import { KedroParser } from "../parsers/data-processing/KedroParser";
import { DVCParser } from "../parsers/data-processing/DVCParser";
import { PrefectParser } from "../parsers/data-processing/PrefectParser";

export class DataProcessingPipeline implements IPipeline {
  type: PipelinePatternType = PipelinePatternType.DATA_PROCESSING;
  parsers: ParserWithPatterns[] = [
    Object.assign(new AirflowParser(), { patterns: ['**/dags/*.py'] }),
    Object.assign(new KedroParser(), { patterns: ['**/src/**/pipeline.py', '**/src/**/pipelines/**/pipeline.py'] }),
    Object.assign(new DVCParser(), { patterns: ['**/dvc.yaml', '**/dvc.yml'] }),
    Object.assign(new PrefectParser(), { patterns: ['**/*.py'] }),
  ];
}
