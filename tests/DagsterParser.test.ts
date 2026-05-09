import { DagsterParser } from '../src/extension/parsers/data-processing/DagsterParser';

describe('DagsterParser', () => {
  const parser = new DagsterParser();

  describe('canParse', () => {
    it('returns true for files using "from dagster import ..."', () => {
      const content = 'from dagster import asset, Definitions\n@asset\ndef my_asset(): pass';
      expect(parser.canParse('defs.py', content)).toBe(true);
    });

    it('returns true for files using "import dagster"', () => {
      const content = 'import dagster\n\ndef my_job():\n    pass';
      expect(parser.canParse('job.py', content)).toBe(true);
    });

    it('returns true for files using "@op" decorator', () => {
      const content = 'from dagster import op\n\n@op\ndef my_op(context):\n    pass';
      expect(parser.canParse('ops.py', content)).toBe(true);
    });

    it('returns true for files defining "Definitions("', () => {
      const content = 'from dagster import Definitions\n\ndefs = Definitions(assets=[], jobs=[])';
      expect(parser.canParse('defs.py', content)).toBe(true);
    });

    it('returns false for non-Dagster Python files', () => {
      const content = 'def not_dagster():\n    return "hello"';
      expect(parser.canParse('script.py', content)).toBe(false);
    });
  });

  it('should parse assets and their dependencies from arguments', async () => {
    const content = `
from dagster import asset

@asset
def raw_data():
    return [1, 2, 3]

@asset
def processed_data(raw_data):
    return [x * 10 for x in raw_data]
`;
    const result = await parser.parse(content, 'dummy.py');
    expect(result.framework).toBe('Dagster');
    expect(result.nodes.length).toBe(2);

    const raw = result.nodes.find(n => n.id === 'raw_data');
    const processed = result.nodes.find(n => n.id === 'processed_data');

    expect(raw?.type).toBe('artifact');
    expect(processed?.type).toBe('artifact');

    expect(result.edges.length).toBe(1);
    expect(result.edges[0]).toEqual({
        id: 'e-raw_data-processed_data',
        source: 'raw_data',
        target: 'processed_data'
    });
  });

  it('should not create edges for assets without arguments', async () => {
    const content = `
from dagster import asset

@asset
def upstream_asset():
    return [1, 2, 3]

@asset
def downstream_asset():
    return "no dependencies here"
`;
    const result = await parser.parse(content, 'no_args.py');
    expect(result.framework).toBe('Dagster');
    expect(result.nodes.map(n => n.id).sort()).toEqual(
      expect.arrayContaining(['upstream_asset', 'downstream_asset']),
    );
    expect(result.edges.length).toBe(0);
  });

  it('should ignore *args and **kwargs when parsing dependencies', async () => {
    const content = `
from dagster import asset

@asset
def flexible_asset(*args, **kwargs):
    return sum(args) if args else 0
`;
    const result = await parser.parse(content, 'varargs.py');
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0]?.id).toBe('flexible_asset');
    expect(result.edges.length).toBe(0);
  });

  it('should handle unusual argument syntax and positional-only args', async () => {
    const content = `
from dagster import asset

@asset
def raw_data():
    return [1, 2, 3]

@asset
def other_data():
    return [4, 5, 6]

@asset
def processed_data( raw_data  ,   other_data , /, *args, context = None, **kwargs ):
    return [x * 10 for x in raw_data + other_data]
`;
    const result = await parser.parse(content, 'positional_only.py');
    expect(result.nodes.map(n => n.id).sort()).toEqual(
      expect.arrayContaining(['raw_data', 'other_data', 'processed_data']),
    );
    const sources = result.edges.map(e => e.source).sort();
    expect(sources).toEqual(expect.arrayContaining(['other_data', 'raw_data']));
    expect(result.edges.length).toBe(2);
  });

  it('should parse dependencies from deps argument in decorator', async () => {
    const content = `
@asset(deps=["upstream_asset"])
def downstream_asset():
    pass
`;
    const result = await parser.parse(content, 'dummy.py');
    expect(result.edges.length).toBe(1);
    expect(result.edges[0]).toEqual({
        id: 'e-upstream_asset-downstream_asset',
        source: 'upstream_asset',
        target: 'downstream_asset'
    });
    expect(result.nodes.find(n => n.id === 'upstream_asset')).toBeDefined();
  });

  it('should parse multiple deps and AssetKey deps in decorator', async () => {
    const content = `
from dagster import asset, AssetKey

@asset(deps=["upstream_asset", "another_upstream", AssetKey("keyed_asset")])
def downstream_asset():
    pass
`;
    const result = await parser.parse(content, 'dummy.py');
    expect(result.edges.length).toBe(3);
    const sources = result.edges.map(e => e.source).sort();
    expect(sources).toEqual(['another_upstream', 'keyed_asset', 'upstream_asset']);
  });

  it('should skip complex function signatures', async () => {
    const content = `
@asset
def complex_asset(arg: Dict[str, int] = {"a": 1}):
    pass
`;
    const result = await parser.parse(content, 'complex.py');
    expect(result.nodes.length).toBe(0);
    expect(result.edges.length).toBe(0);
  });

  it('should handle multiline decorators and definitions', async () => {
    const content = `
@asset(
    deps=["upstream"]
)
def multiline_asset(
    context,
    upstream
):
    pass
`;
    const result = await parser.parse(content, 'multiline.py');
    expect(result.nodes.map(n => n.id)).toContain('multiline_asset');
    expect(result.edges.length).toBe(1);
    expect(result.edges[0].source).toBe('upstream');
  });
});
