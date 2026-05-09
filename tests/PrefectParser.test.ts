import { PrefectParser } from '../src/extension/parsers/data-processing/PrefectParser';

describe('PrefectParser', () => {
  let parser: PrefectParser;

  beforeEach(() => {
    parser = new PrefectParser();
  });

  it('should identify Prefect files', () => {
    const content = "from prefect import flow, task\n@flow\ndef my_flow():\n  pass";
    expect(parser.canParse('flow.py', content)).toBe(true);
    expect(parser.canParse('flow.py', 'print("hello")')).toBe(false);
    expect(parser.canParse('flow.txt', content)).toBe(false);
  });

  it('should parse tasks and dependencies from a flow', async () => {
    const content = `
from prefect import flow, task

@task
def task_a():
    return "a"

@task
def task_b(data):
    return "b"

@task
def task_c(wait_for=None):
    pass

@flow
def my_flow():
    a = task_a.submit()
    b = task_b(a)
    c = task_c.submit(wait_for=[a, b])
    `;

    const result = await parser.parse(content, 'test.py');

    expect(result.framework).toBe('Prefect');
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.map(n => n.id)).toContain('task_a');
    expect(result.nodes.map(n => n.id)).toContain('task_b');
    expect(result.nodes.map(n => n.id)).toContain('task_c');

    expect(result.edges).toContainEqual(expect.objectContaining({ source: 'task_a', target: 'task_b' }));
    expect(result.edges).toContainEqual(expect.objectContaining({ source: 'task_a', target: 'task_c' }));
    expect(result.edges).toContainEqual(expect.objectContaining({ source: 'task_b', target: 'task_c' }));
  });

  it('should handle direct task calls as dependencies', async () => {
    const content = `
from prefect import flow, task

@task
def task_1():
    return 1

@task
def task_2(val):
    return val + 1

@flow
def my_flow():
    task_2(task_1())
    `;

    const result = await parser.parse(content, 'test.py');
    expect(result.edges).toContainEqual(expect.objectContaining({ source: 'task_1', target: 'task_2' }));
  });
});
