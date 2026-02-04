import { GitHubActionsParser } from '../src/extension/parsers/cicd/GitHubActionsParser';

describe('GitHubActionsParser', () => {
    let parser: GitHubActionsParser;

    beforeEach(() => {
        parser = new GitHubActionsParser();
    });

    it('should identify GitHub Action files', () => {
        expect(parser.canParse('.github/workflows/main.yml', '')).toBe(true);
        expect(parser.canParse('.github/workflows/deploy.yaml', '')).toBe(true);
        expect(parser.canParse('/abs/path/.github/workflows/test.yml', '')).toBe(true);

        expect(parser.canParse('workflows/main.yml', '')).toBe(false);
        expect(parser.canParse('.github/main.yml', '')).toBe(false);
        expect(parser.canParse('.github/workflows/readme.md', '')).toBe(false);
        expect(parser.canParse('other.yml', '')).toBe(false);
    });
});
