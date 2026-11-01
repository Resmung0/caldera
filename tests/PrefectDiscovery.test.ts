import { workspace } from 'vscode';
import { discoverPipelines } from '../src/extension/extension';
import { PipelineWebviewProvider } from '../src/extension/WebviewProvider';
import { DataProcessingPipeline } from '../src/extension/pipelines/DataProcessingPipeline';

describe('Prefect pipeline discovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('excludes virtual environments from discovered and displayed Python pipelines', async () => {
    const projectPath = '/workspace/app/flows.py';
    const environmentPath = '/workspace/.venv/lib/python3.12/site-packages/prefect/flow.py';
    const files = [projectPath, environmentPath].map((fsPath) => ({ fsPath }));

    (workspace.findFiles as jest.Mock).mockImplementation(async (_pattern, exclude) =>
      files.filter(({ fsPath }) => !fsPath.includes('/.venv/') || !exclude.includes('.venv'))
    );
    (workspace.openTextDocument as jest.Mock).mockImplementation(async ({ fsPath }) => ({
      getText: () => fsPath === projectPath
        ? `from prefect import flow, task\n@task\ndef project_task(): pass\n@flow\ndef project_flow():\n    project_task()`
        : `from prefect import flow\n@flow\ndef library_flow(): pass`,
    }));

    const provider = {
      setLoading: jest.fn(),
      updatePipeline: jest.fn(),
    } as unknown as PipelineWebviewProvider;
    const pipeline = new DataProcessingPipeline();

    await discoverPipelines(provider, pipeline);

    expect(workspace.findFiles).toHaveBeenCalledWith(
      '**/*.py',
      expect.stringContaining('.venv')
    );
    expect(provider.updatePipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        nodes: [
          expect.objectContaining({
            label: 'project_task',
            data: expect.objectContaining({
              prefectFlowIds: [`${projectPath}::project_flow`],
            }),
          }),
          expect.objectContaining({
            label: 'project_flow',
            data: expect.objectContaining({
              prefectTaskIds: [`${projectPath}::project_task`],
              prefectTaskCount: 1,
              prefectTasks: [
                {
                  id: `${projectPath}::project_task`,
                  label: 'project_task',
                  dependencies: [],
                },
              ],
            }),
          }),
        ],
      }),
      [projectPath]
    );
  });

  it('prefixes nested flow membership and dependency edges during discovery', async () => {
    const projectPath = '/workspace/app/function_based_flow.py';
    const source = `from prefect import flow, task

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
`;
    (workspace.findFiles as jest.Mock).mockResolvedValue([{ fsPath: projectPath }]);
    (workspace.openTextDocument as jest.Mock).mockResolvedValue({
      getText: () => source,
    });

    const provider = {
      setLoading: jest.fn(),
      updatePipeline: jest.fn(),
    } as unknown as PipelineWebviewProvider;

    await discoverPipelines(provider, new DataProcessingPipeline());

    expect(provider.updatePipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({
            id: `${projectPath}::even_or_odd`,
            data: expect.objectContaining({
              prefectChildFlowIds: [`${projectPath}::is_number_even`],
              prefectTaskIds: [`${projectPath}::generate_a_number`],
            }),
          }),
          expect.objectContaining({
            id: `${projectPath}::is_number_even`,
            data: expect.objectContaining({
              prefectFlowIds: [`${projectPath}::even_or_odd`],
            }),
          }),
        ]),
        edges: expect.arrayContaining([
          expect.objectContaining({
            source: `${projectPath}::generate_a_number`,
            target: `${projectPath}::is_number_even`,
          }),
          expect.objectContaining({
            source: `${projectPath}::is_number_even`,
            target: `${projectPath}::even_or_odd`,
          }),
        ]),
      }),
      [projectPath]
    );
  });
});
