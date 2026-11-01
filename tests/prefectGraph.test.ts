import {
  getExpandedPrefectFlowAnnotations,
  getVisiblePrefectGraph,
  toggleFlowNode,
} from '../src/webview/prefectGraph';

describe('Prefect graph expansion', () => {
  const nodes = [
    { id: 'flow-a', data: { label: 'Flow A', prefectType: 'flow', prefectTaskIds: ['task-shared', 'task-a'], isFlowExpanded: false } },
    { id: 'flow-b', data: { label: 'Flow B', prefectType: 'flow', prefectTaskIds: ['task-shared'], isFlowExpanded: false } },
    { id: 'task-shared', data: { prefectType: 'task', prefectFlowIds: ['flow-a', 'flow-b'] } },
    { id: 'task-a', data: { prefectType: 'task', prefectFlowIds: ['flow-a'] } },
    { id: 'task-unassigned', data: { prefectType: 'task', prefectFlowIds: [] } },
    { id: 'ordinary-node', data: { framework: 'Other' } },
  ];
  const edges = [
    { id: 'flow-edge', source: 'flow-a', target: 'flow-b' },
    { id: 'task-edge', source: 'task-shared', target: 'task-a' },
    { id: 'unassigned-edge', source: 'task-unassigned', target: 'ordinary-node' },
  ];

  it('hides grouped task nodes and their edges while their flow is collapsed', () => {
    const graph = getVisiblePrefectGraph(nodes, edges);

    expect(graph.nodes.map(({ id }) => id)).toEqual([
      'flow-a',
      'flow-b',
      'task-unassigned',
      'ordinary-node',
    ]);
    expect(graph.edges.map(({ id }) => id)).toEqual(['flow-edge', 'unassigned-edge']);
  });

  it('reveals the real task nodes and their dependency edges when a flow expands', () => {
    const expandedNodes = toggleFlowNode(nodes, 'flow-a');
    const graph = getVisiblePrefectGraph(expandedNodes, edges);

    expect(expandedNodes[0].data.isFlowExpanded).toBe(true);
    expect(graph.nodes.map(({ id }) => id)).toEqual([
      'flow-b',
      'task-shared',
      'task-a',
      'task-unassigned',
      'ordinary-node',
    ]);
    expect(graph.edges.map(({ id }) => id)).toEqual([
      'task-edge',
      'unassigned-edge',
    ]);
  });

  it('restores the original Flow node and hides its tasks when a Flow annotation collapses it', () => {
    const expandedNodes = toggleFlowNode(nodes, 'flow-a');
    const collapsedNodes = toggleFlowNode(expandedNodes, 'flow-a');
    const graph = getVisiblePrefectGraph(collapsedNodes, edges);

    expect(graph.nodes.map(({ id }) => id)).toEqual([
      'flow-a',
      'flow-b',
      'task-unassigned',
      'ordinary-node',
    ]);
    expect(graph.edges.map(({ id }) => id)).toEqual(['flow-edge', 'unassigned-edge']);
    expect(getExpandedPrefectFlowAnnotations(collapsedNodes)).toEqual([]);
  });

  it('creates a pink annotation around the expanded flow contents', () => {
    const expandedNodes = toggleFlowNode(nodes, 'flow-a');
    const [annotation] = getExpandedPrefectFlowAnnotations(expandedNodes);

    expect(annotation).toMatchObject({
      id: 'prefect-flow:flow-a',
      nodeIds: ['task-shared', 'task-a'],
      color: '#f20d63',
      label: 'Flow: Flow A',
      source: 'prefect-flow',
      flowId: 'flow-a',
    });
  });

  it('does not create an annotation for a collapsed or taskless flow', () => {
    expect(getExpandedPrefectFlowAnnotations(nodes)).toEqual([]);
    expect(getExpandedPrefectFlowAnnotations([
      { id: 'empty-flow', data: { prefectType: 'flow', isFlowExpanded: true } },
    ])).toEqual([]);
  });

  it('reveals nested flows with their parent and waits for each nested flow to expand its tasks', () => {
    const nestedNodes = [
      {
        id: 'root-flow',
        data: {
          label: 'Root',
          prefectType: 'flow',
          prefectFlowIds: [],
          prefectChildFlowIds: ['child-flow'],
          prefectTaskIds: ['root-task', 'child-task'],
          isFlowExpanded: false,
        },
      },
      {
        id: 'child-flow',
        data: {
          label: 'Child',
          prefectType: 'flow',
          prefectFlowIds: ['root-flow'],
          prefectChildFlowIds: [],
          prefectTaskIds: ['child-task'],
          isFlowExpanded: false,
        },
      },
      { id: 'root-task', data: { prefectType: 'task', prefectFlowIds: ['root-flow'] } },
      { id: 'child-task', data: { prefectType: 'task', prefectFlowIds: ['child-flow'] } },
    ];

    const rootExpanded = toggleFlowNode(nestedNodes, 'root-flow');
    const visibleAfterRootExpansion = getVisiblePrefectGraph(rootExpanded, []);
    expect(visibleAfterRootExpansion.nodes.map(({ id }) => id)).toEqual([
      'root-task',
      'child-task',
    ]);

    const allExpanded = toggleFlowNode(rootExpanded, 'child-flow');
    expect(getVisiblePrefectGraph(allExpanded, []).nodes.map(({ id }) => id)).toEqual([
      'root-task',
      'child-task',
    ]);
    expect(getExpandedPrefectFlowAnnotations(allExpanded)[0].nodeIds).toEqual([
      'root-task',
      'child-task',
    ]);
  });

  it('does not mutate unrelated nodes when toggling one flow', () => {
    const toggledNodes = toggleFlowNode(nodes, 'flow-a');

    expect(toggledNodes[1]).toBe(nodes[1]);
    expect(toggledNodes[2]).toBe(nodes[2]);
  });
});
