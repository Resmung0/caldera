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
      getText: () => `from prefect import flow\n@flow\ndef ${fsPath === projectPath ? 'project_flow' : 'library_flow'}(): pass`,
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
        nodes: [expect.objectContaining({ label: 'project_flow' })],
      }),
      [projectPath]
    );
  });
});
