import { GitLabCIParser } from '../src/extension/parsers/cicd/GitLabCIParser';

describe('GitLabCIParser', () => {
  let parser: GitLabCIParser;

  beforeEach(() => {
    parser = new GitLabCIParser();
  });

  it('should identify .gitlab-ci.yml files', () => {
    expect(parser.canParse('.gitlab-ci.yml', '')).toBe(true);
    expect(parser.canParse('.gitlab-ci.yaml', '')).toBe(true);
    expect(parser.canParse('/path/to/.gitlab-ci.yml', '')).toBe(true);
    expect(parser.canParse('.gitlab/ci/build.yml', '')).toBe(true);
    expect(parser.canParse('other.yml', '')).toBe(false);
    expect(parser.canParse('.gitlab/not-ci/build.yml', '')).toBe(false);
    expect(parser.canParse('gitlab/ci/build.yml', '')).toBe(false);
  });

  it('should extract jobs as nodes', async () => {
    const yaml = `
job1:
  script: echo "hello"
job2:
  script: echo "world"
`;
    const result = await parser.parse(yaml, '.gitlab-ci.yml');
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.map(n => n.id)).toContain('job1');
    expect(result.nodes.map(n => n.id)).toContain('job2');
  });

  it('should skip reserved keywords', async () => {
    const yaml = `
stages:
  - build
  - test
variables:
  VAR: val
job1:
  stage: build
  script: echo "hello"
`;
    const result = await parser.parse(yaml, '.gitlab-ci.yml');
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('job1');
  });

  it('should extract dependencies from needs', async () => {
    const yaml = `
job1:
  stage: build
  script: echo "hello"
job2:
  stage: test
  script: echo "world"
  needs: ["job1"]
`;
    const result = await parser.parse(yaml, '.gitlab-ci.yml');
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].source).toBe('job1');
    expect(result.edges[0].target).toBe('job2');
  });

  it('should ignore dangling dependencies from needs', async () => {
    const yaml = `
job1:
  stage: build
  script: echo "hello"
job2:
  stage: test
  script: echo "world"
  needs: ["non-existent-job"]
`;
    const result = await parser.parse(yaml, '.gitlab-ci.yml');
    expect(result.edges).toHaveLength(0);
  });

  it('should handle implicit stage dependencies', async () => {
    const yaml = `
stages:
  - build
  - test
job1:
  stage: build
  script: echo "hello"
job2:
  stage: test
  script: echo "world"
`;
    const result = await parser.parse(yaml, '.gitlab-ci.yml');
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].source).toBe('job1');
    expect(result.edges[0].target).toBe('job2');
  });

  it('should skip empty stages when calculating implicit dependencies', async () => {
    const yaml = `
stages:
  - build
  - test
  - deploy
job1:
  stage: build
  script: echo "hello"
job3:
  stage: deploy
  script: echo "world"
`;
    const result = await parser.parse(yaml, '.gitlab-ci.yml');
    // job3 should depend on job1 because test stage is empty
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].source).toBe('job1');
    expect(result.edges[0].target).toBe('job3');
  });

  it('should create dependencies to all previous stages', async () => {
    const yaml = `
stages:
  - build
  - test
  - deploy
job1:
  stage: build
  script: echo "b"
job2:
  stage: test
  script: echo "t"
job3:
  stage: deploy
  script: echo "d"
`;
    const result = await parser.parse(yaml, '.gitlab-ci.yml');
    // job2 depends on job1 (1 edge)
    // job3 depends on job2 AND job1 (2 edges)
    // total edges: 3
    expect(result.edges).toHaveLength(3);
    expect(result.edges.filter(e => e.target === 'job3')).toHaveLength(2);
  });

  it('should not add implicit dependencies if needs is an empty array', async () => {
    const yaml = `
stages:
  - build
  - test
job1:
  stage: build
  script: echo "hello"
job2:
  stage: test
  script: echo "world"
  needs: []
`;
    const result = await parser.parse(yaml, '.gitlab-ci.yml');
    // job2 has needs: [], so it should have NO edges
    expect(result.edges).toHaveLength(0);
  });
});
