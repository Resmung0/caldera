import { DagsterParser } from '../src/extension/parsers/data-processing/DagsterParser';

describe('DagsterParser', () => {
  const parser = new DagsterParser();

  it('should identify Dagster files', () => {
    const content = 'from dagster import asset, Definitions\n@asset\ndef my_asset(): pass';
    expect(parser.canParse('defs.py', content)).toBe(true);
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
    // Should also detect upstream_asset as an external asset
    expect(result.nodes.find(n => n.id === 'upstream_asset')).toBeDefined();
  });

  it('should handle ops and mixed pipelines', async () => {
    const content = `
@asset
def my_asset(): pass

@op
def my_op(my_asset): pass
`;
    const result = await parser.parse(content, 'dummy.py');
    const op = result.nodes.find(n => n.id === 'my_op');
    expect(op?.type).toBe('default');
    expect(result.edges[0].source).toBe('my_asset');
    expect(result.edges[0].target).toBe('my_op');
  });

  it('should handle type hints in arguments', async () => {
    const content = `
@asset
def typed_asset(upstream: DataFrame, context: AssetExecutionContext):
    pass
`;
    const result = await parser.parse(content, 'dummy.py');
    expect(result.edges.length).toBe(1);
    expect(result.edges[0].source).toBe('upstream');
  });
});
