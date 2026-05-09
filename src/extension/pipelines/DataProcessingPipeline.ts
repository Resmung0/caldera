import { IPipeline, ParserWithPatterns } from "./IPipeline";
import { PipelinePatternType } from "../../shared/types";
import { AirflowParser } from "../parsers/data-processing/AirflowParser";
import { KedroParser } from "../parsers/data-processing/KedroParser";
import { DVCParser } from "../parsers/data-processing/DVCParser";
import { DagsterParser } from "../parsers/data-processing/DagsterParser";

export class DataProcessingPipeline implements IPipeline {
  type: PipelinePatternType = PipelinePatternType.DATA_PROCESSING;
  parsers: ParserWithPatterns[] = [
    Object.assign(new AirflowParser(), { patterns: ['**/dags/*.py'] }),
    Object.assign(new KedroParser(), { patterns: ['**/src/**/pipeline.py', '**/src/**/pipelines/**/pipeline.py'] }),
    Object.assign(new DVCParser(), { patterns: ['**/dvc.yaml', '**/dvc.yml'] }),
    Object.assign(new DagsterParser(), {
      patterns: [
        '**/dagster_*/**/*.py', // common Dagster project/package prefix
        '**/*_dagster.py',      // files explicitly named for Dagster usage
        '**/*assets.py',        // Dagster assets modules
        '**/*jobs.py',          // Dagster jobs definitions
        '**/*schedules.py',     // Dagster schedules
        '**/*sensors.py',       // Dagster sensors
        '**/*repository.py',    // Dagster repository definitions
      ],
    }),
  ];
}
