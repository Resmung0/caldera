import { IPipeline, ParserWithPatterns } from "./IPipeline";
import { PipelineType } from "../../shared/types";
import { GitHubActionsParser } from "../parsers/cicd/GitHubActionsParser";
import { GitLabCIParser } from "../parsers/cicd/GitLabCIParser";

export class CICDPipeline implements IPipeline {
  type: PipelineType = PipelineType.CICD;
  parsers: ParserWithPatterns[] = [
    Object.assign(new GitHubActionsParser(), { patterns: ['**/.github/workflows/*.yml', '**/.github/workflows/*.yaml'] }),
    Object.assign(new GitLabCIParser(), { patterns: ['**/.gitlab-ci.yml', '**/.gitlab-ci.yaml', '**/*.gitlab-ci.yml', '**/*.gitlab-ci.yaml', '**/.gitlab/ci/*.yml', '**/.gitlab/ci/*.yaml'] }),
  ];
}
