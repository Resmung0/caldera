import { AirflowParser } from '../src/extension/parsers/data-processing/AirflowParser';

describe('AirflowParser', () => {
  let parser: AirflowParser;

  beforeEach(() => {
    parser = new AirflowParser();
  });

  describe('canParse', () => {
    it('should return true for classic DAG definition', () => {
      const content = `
from airflow import DAG
from airflow.operators.bash import BashOperator

with DAG("test_dag", start_date=datetime(2021, 1, 1)) as dag:
    task = BashOperator(task_id="test", bash_command="echo hello")
`;
      expect(parser.canParse('dag.py', content)).toBe(true);
    });

    it('should return true for TaskFlow API DAG definition', () => {
      const content = `
from airflow.decorators import dag, task

@dag(dag_id="test_dag")
def my_dag():
    @task
    def my_task():
        return "hello"
    my_task()
`;
      expect(parser.canParse('dag.py', content)).toBe(true);
    });

    it('should return false for non-Airflow file', () => {
      const content = `
import pandas as pd
df = pd.read_csv("data.csv")
`;
      expect(parser.canParse('script.py', content)).toBe(false);
    });
  });

  describe('parse', () => {
    const filePath = 'dags/test_dag.py';
    const dagContent = `
from airflow.decorators import dag, task

@dag(dag_id="test_dag")
def my_dag():
    @task
    def my_task():
        return "hello"
    my_task()
`;

    const nonDagContent = `
def my_dag():
    return "not an airflow dag"
`;

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should use Airflow CLI when available and successful', async () => {
      const cliResult = { nodes: [{ id: 'task1', label: 'task1' }], edges: [] };

      jest.spyOn(parser as any, 'getAirflowCmd').mockResolvedValue({
          commandInfo: { command: 'airflow', args: [] },
          isLocal: false
      });

      const tryParseWithCLISpy = jest
        .spyOn(parser as any, 'tryParseWithCLI')
        .mockResolvedValue(cliResult);

      const parseWithRegexSpy = jest.spyOn(parser as any, 'parseWithRegex');

      const result = await parser.parse(dagContent, filePath);

      expect(tryParseWithCLISpy).toHaveBeenCalledTimes(1);
      expect(parseWithRegexSpy).not.toHaveBeenCalled();
      expect(result).toBe(cliResult);
    });

    it('should fall back to regex when tryParseWithCLI returns null', async () => {
      const regexResult = { nodes: [{ id: 'task_from_regex', label: 'task_from_regex' }], edges: [] };

      jest.spyOn(parser as any, 'getAirflowCmd').mockResolvedValue({
        commandInfo: { command: 'airflow', args: [] },
        isLocal: false
      });

      const tryParseWithCLISpy = jest
        .spyOn(parser as any, 'tryParseWithCLI')
        .mockResolvedValue(null);

      const parseWithRegexSpy = jest
        .spyOn(parser as any, 'parseWithRegex')
        .mockResolvedValue(regexResult);

      const result = await parser.parse(dagContent, filePath);

      expect(tryParseWithCLISpy).toHaveBeenCalledTimes(1);
      expect(parseWithRegexSpy).toHaveBeenCalledTimes(1);
      expect(result).toBe(regexResult);
    });

    it('should skip CLI and use regex when no dag_id is extracted', async () => {
      const regexResult = { nodes: [{ id: 'task_from_regex', label: 'task_from_regex' }], edges: [] };

      jest.spyOn(parser as any, 'getAirflowCmd').mockResolvedValue({
        commandInfo: { command: 'airflow', args: [] },
        isLocal: false
      });

      const tryParseWithCLISpy = jest.spyOn(parser as any, 'tryParseWithCLI');
      const parseWithRegexSpy = jest
        .spyOn(parser as any, 'parseWithRegex')
        .mockResolvedValue(regexResult);

      const result = await parser.parse(nonDagContent, filePath);

      expect(parseWithRegexSpy).toHaveBeenCalledTimes(1);
      expect(result).toBe(regexResult);
    });
  });

  describe('parseWithRegex', () => {
    it('should extract tasks and edges from TaskFlow DAG', () => {
      const content = `
@dag(dag_id="test_dag")
def my_dag():
    @task
    def task_a():
        return "a"

    @task
    def task_b():
        return "b"

    task_a() >> task_b()
`;
      const result = (parser as any).parseWithRegex(content, 'dag.py');
      expect(result.nodes).toContainEqual(expect.objectContaining({ id: 'task_a' }));
      expect(result.nodes).toContainEqual(expect.objectContaining({ id: 'task_b' }));
      expect(result.edges).toContainEqual(expect.objectContaining({ source: 'task_a', target: 'task_b' }));

      const nodeA = result.nodes.find((n: any) => n.id === 'task_a');
      expect(nodeA.data.codeDeps.length).toBeGreaterThan(0);
      expect(nodeA.data.codeDeps[0].snippet).toContain('def task_a');
    });

    it('should handle << and set_upstream', () => {
        const content = `
task_b() << task_a()
task_d.set_upstream(task_c)
`;
        const result = (parser as any).parseWithRegex(content, 'dag.py');
        expect(result.edges).toContainEqual(expect.objectContaining({ source: 'task_a', target: 'task_b' }));
        expect(result.edges).toContainEqual(expect.objectContaining({ source: 'task_c', target: 'task_d' }));
    });

    it('should infer task ids from variable names when task_id is omitted', () => {
        const content = `
task1 = BashOperator()
task2 = BashOperator()
task1 >> task2
`;
        const result = (parser as any).parseWithRegex(content, 'dag.py');
        expect(result.nodes).toContainEqual(expect.objectContaining({ id: 'task1' }));
        expect(result.nodes).toContainEqual(expect.objectContaining({ id: 'task2' }));
        expect(result.edges).toContainEqual(expect.objectContaining({ source: 'task1', target: 'task2' }));
    });

    it('should resolve dependencies using both variable names and task_ids', () => {
        const content = `
bash_task_var = BashOperator(task_id="bash_task")
python_task_var = PythonOperator(task_id="python_task")
bash_task_var >> python_task_var
`;
        const result = (parser as any).parseWithRegex(content, 'dag.py');
        expect(result.nodes).toContainEqual(expect.objectContaining({ id: 'bash_task' }));
        expect(result.nodes).toContainEqual(expect.objectContaining({ id: 'python_task' }));
        expect(result.edges).toContainEqual(expect.objectContaining({ source: 'bash_task', target: 'python_task' }));
    });
  });

  describe('parseDot', () => {
    it('should parse Airflow DOT output', () => {
      const dot = `
digraph test_dag {
	"task_1" [label="task_1" shape=rect]
	"task_2" [label="task_2" shape=rect]
	"task_1" -> "task_2"
}
      `;
      const result = (parser as any).parseDot(dot, 'dag.py');
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0]).toEqual(expect.objectContaining({ id: 'task_1', label: 'task_1' }));
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]).toEqual(expect.objectContaining({ source: 'task_1', target: 'task_2' }));
    });
  });

  describe('tryParseWithCLI', () => {
      it('should return null when CLI output is not DOT', async () => {
          jest.spyOn(parser as any, 'extractDagId').mockReturnValue('test_dag');
          jest.spyOn(parser as any, 'parseWithCLI').mockRejectedValue(new Error('Invalid DOT'));

          const result = await (parser as any).tryParseWithCLI('content', 'dag.py', { command: 'airflow', args: [] }, '.');
          expect(result).toBeNull();
      });
  });
});
