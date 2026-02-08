import { IPipeline, ParserWithPatterns } from "./IPipeline";
import { PipelinePatternType } from "../../shared/types";
import { GitHubActionsParser } from "../parsers/cicd/GitHubActionsParser";
import { GitLabCIParser } from "../parsers/cicd/GitLabCIParser";

export class CICDPipeline implements IPipeline {
  type: PipelinePatternType = PipelinePatternType.CICD;
  parsers: ParserWithPatterns[] = [
    Object.assign(new GitHubActionsParser(), { patterns: ['**/.github/workflows/*.yml', '**/.github/workflows/*.yaml'] }),
    Object.assign(new GitLabCIParser(), { patterns: ['**/.gitlab-ci.yml', '**/.gitlab-ci.yaml', '**/*.gitlab-ci.yml', '**/*.gitlab-ci.yaml', '**/.gitlab/ci/*.yml', '**/.gitlab/ci/*.yaml'] }),
  ];
}
