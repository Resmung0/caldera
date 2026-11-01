import { PrefectParser } from '../src/extension/parsers/data-processing/PrefectParser';

describe('PrefectParser', () => {
  let parser: PrefectParser;

  beforeEach(() => {
    parser = new PrefectParser();
  });

  it('should identify Prefect files with different import styles', () => {
    expect(parser.canParse('flow.py', "from prefect import flow\n@flow\ndef f(): pass")).toBe(true);
    expect(parser.canParse('flow.py', "import prefect\n@prefect.flow\ndef f(): pass")).toBe(true);
    expect(parser.canParse('flow.py', "from prefect import flow as f\n@f\ndef g(): pass")).toBe(true);
    expect(parser.canParse('flow.py', "from prefect import flow\n@flow()\ndef f(): pass")).toBe(true);
    expect(parser.canParse('flow.py', 'print("hello")')).toBe(false);
    expect(parser.canParse('flow.txt', "import prefect\n@flow\ndef f(): pass")).toBe(false);
    expect(parser.canParse('flow.py', "from other import flow\n@flow\ndef f(): pass")).toBe(false);
  });

  it('should parse multiple flows in a single file', async () => {
    const content = `
from prefect import flow, task

@task
def task_a(): pass

@task
def task_b(a): pass

@flow
def flow_1():
    a = task_a()
    task_b(a)

@flow
def flow_2():
    a = task_a()
    task_b(a)
    `;

    const result = await parser.parse(content, 'test.py');
    expect(result.nodes.filter(({ data }) => data?.prefectType === 'task')).toHaveLength(2);
    expect(result.nodes.filter(({ data }) => data?.prefectType === 'flow')).toHaveLength(2);
    expect(result.nodes.find(({ id }) => id === 'flow_1')?.data).toMatchObject({
      prefectTaskIds: ['task_a', 'task_b'],
      prefectTaskCount: 2,
      prefectTasks: [
        { id: 'task_a', label: 'task_a', dependencies: [] },
        { id: 'task_b', label: 'task_b', dependencies: ['task_a'] },
      ],
    });
    expect(result.nodes.find(({ id }) => id === 'task_a')?.data.prefectFlowIds).toEqual([
      'flow_1',
      'flow_2',
    ]);
    expect(result.edges).toHaveLength(1); // task_a -> task_b
  });

  it('should connect a task through a nested flow to its parent flow', async () => {
    const content = `
from prefect import flow, task

@task
def generate_a_number():
    return 42

@flow
def is_number_even(number: int):
    return number % 2 == 0

@flow
def even_or_odd():
    number = generate_a_number()
    if is_number_even(number):
        print("The number is even")
    else:
        print("The number is odd")
`;

    const result = await parser.parse(content, 'function_based_flow.py');

    expect(result.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'generate_a_number', target: 'is_number_even' }),
      expect.objectContaining({ source: 'is_number_even', target: 'even_or_odd' }),
    ]));
    expect(result.nodes.find(({ id }) => id === 'even_or_odd')?.data).toMatchObject({
      prefectChildFlowIds: ['is_number_even'],
      prefectTaskIds: ['generate_a_number'],
      prefectTaskCount: 1,
    });
    expect(result.nodes.find(({ id }) => id === 'is_number_even')?.data.prefectFlowIds).toEqual([
      'even_or_odd',
    ]);
  });

  it('should parse tasks and dependencies from a flow with .submit() and direct calls', async () => {
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
def submit_style_flow():
    a = task_a.submit()
    b = task_b.submit(a)
    c = task_c.submit(wait_for=[a, b])

@flow
def direct_call_flow():
    a = task_a()
    b = task_b(a)
    c = task_c(wait_for=[a, b])
    `;

    const result = await parser.parse(content, 'test.py');

    expect(result.framework).toBe('Prefect');
    expect(result.nodes.filter(({ data }) => data?.prefectType === 'task')).toHaveLength(3);
    expect(result.nodes.filter(({ data }) => data?.prefectType === 'flow')).toHaveLength(2);
    expect(result.nodes.find(({ id }) => id === 'submit_style_flow')?.data.prefectTaskCount).toBe(3);
    expect(result.nodes.find(({ id }) => id === 'direct_call_flow')?.data.prefectTaskIds).toEqual([
      'task_a',
      'task_b',
      'task_c',
    ]);

    // Edges should be deduplicated
    expect(result.edges).toHaveLength(3);
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

  it('should avoid false-positive variable matches', async () => {
    const content = `
from prefect import flow, task

@task
def a_task(): pass

@task
def b_task(data): pass

@flow
def my_flow():
    a = a_task()
    b = b_task("data") # 'a' is a substring of 'data' and 'b_task'
    `;

    const result = await parser.parse(content, 'test.py');
    // There should be no edge from 'a_task' to 'b_task' because 'a' variable is not used in b_task call
    expect(result.edges).toHaveLength(0);
  });

  it('should include flows that do not contain tasks, including class and generator flows', async () => {
    const classFlows = `
from prefect import flow

class Example:
    @flow
    def instance_flow(self):
        return "instance"

    @flow
    @classmethod
    def class_flow(cls):
        return "class"

    @flow
    @staticmethod
    def static_flow():
        return "static"
`;
    const generatorFlow = `
from prefect import flow

@flow
def generator():
    for value in range(10):
        yield value
`;

    const classResult = await parser.parse(classFlows, 'class_based_flow.py');
    const generatorResult = await parser.parse(generatorFlow, 'generator_function_based_flow.py');

    expect(classResult.nodes.map(({ id }) => id)).toEqual([
      'instance_flow',
      'class_flow',
      'static_flow',
    ]);
    expect(generatorResult.nodes.map(({ id }) => id)).toEqual(['generator']);
    expect(generatorResult.nodes[0].data?.prefectType).toBe('flow');
  });

  it('should recognize async flows and aliased Prefect imports', async () => {
    const content = `
from prefect import flow as prefect_flow

@prefect_flow()
async def async_flow():
    return 1
`;

    expect(parser.canParse('async_flow.py', content)).toBe(true);
    const result = await parser.parse(content, 'async_flow.py');
    expect(result.nodes.map(({ id }) => id)).toEqual(['async_flow']);
  });

  it('should associate only tasks called inside each flow and count taskless flows as zero', async () => {
    const content = `
from prefect import flow, task

@task
def shared_task():
    return 1

@task
def unused_task():
    return 2

@flow
def populated_flow():
    shared_task()

@flow
def empty_flow():
    return "no tasks"
`;

    const result = await parser.parse(content, 'membership.py');

    expect(result.nodes.find(({ id }) => id === 'populated_flow')?.data).toMatchObject({
      prefectTaskIds: ['shared_task'],
      prefectTaskCount: 1,
    });
    expect(result.nodes.find(({ id }) => id === 'empty_flow')?.data).toMatchObject({
      prefectTaskIds: [],
      prefectTaskCount: 0,
    });
    expect(result.nodes.find(({ id }) => id === 'shared_task')?.data.prefectFlowIds).toEqual([
      'populated_flow',
    ]);
    expect(result.nodes.find(({ id }) => id === 'unused_task')?.data.prefectFlowIds).toEqual([]);
  });
});
