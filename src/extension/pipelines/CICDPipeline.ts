import { IPipeline } from "./IPipeline";
import { IParser } from "../parsers/IParser";
import { PipelineType } from "../../shared/types";
import { GitHubActionsParser } from "../parsers/cicd/GitHubActionsParser";
import { GitLabCIParser } from "../parsers/cicd/GitLabCIParser";

export class CICDPipeline implements IPipeline {
  type: PipelineType = PipelineType.CICD;
  parsers: IParser[] = [new GitHubActionsParser(), new GitLabCIParser()];
}
