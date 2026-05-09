import { AirflowParser } from '../src/extension/parsers/data-processing/AirflowParser';

describe('AirflowParser', () => {
  const parser = new AirflowParser();

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
    });

    it('should extract tasks from classic Operators', () => {
        const content = `
task1 = BashOperator(task_id="bash_task", bash_command="echo 1")
task2 = PythonOperator(task_id="python_task", python_callable=my_func)
task1 >> task2
`;
        const result = (parser as any).parseWithRegex(content, 'dag.py');
        expect(result.nodes).toContainEqual(expect.objectContaining({ id: 'bash_task' }));
        expect(result.nodes).toContainEqual(expect.objectContaining({ id: 'python_task' }));
        expect(result.edges).toContainEqual(expect.objectContaining({ source: 'bash_task', target: 'python_task' }));
    });

    it('should extract edges from set_downstream', () => {
        const content = `
task1 = BashOperator(task_id="t1")
task2 = BashOperator(task_id="t2")
task1.set_downstream(task2)
`;
        const result = (parser as any).parseWithRegex(content, 'dag.py');
        expect(result.edges).toContainEqual(expect.objectContaining({ source: 't1', target: 't2' }));
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
});
