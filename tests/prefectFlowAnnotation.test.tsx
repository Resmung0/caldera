/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { PipelinePatternType } from '../src/shared/types';
import AnnotationItem from '../src/webview/components/AnnotationItem';

describe('Prefect Flow annotation rendering', () => {
  it('provides an annotation action to collapse back to the Flow node', () => {
    const onCollapseFlow = jest.fn();
    const { container, getByText, getByRole } = render(
      <AnnotationItem
        annotation={{
          id: 'prefect-flow:flow-a',
          nodeIds: ['task-a'],
          patternType: PipelinePatternType.DATA_PROCESSING,
          patternSubtype: 'flow',
          color: '#f20d63',
          label: 'Flow A',
          source: 'prefect-flow',
          flowId: 'flow-a',
          createdAt: new Date(0),
          modifiedAt: new Date(0),
        }}
        bounds={{ x: 0, y: 0, width: 400, height: 240, padding: 16 }}
        index={0}
        onCollapseFlow={onCollapseFlow}
      />
    );

    const boundary = container.querySelector('.annotation-boundary') as HTMLElement;
    expect(boundary.style.borderColor).toBe('rgb(242, 13, 99)');
    expect(getByText('Flow A')).not.toBeNull();
    expect(container.querySelector('.annotation-icon-container svg')).not.toBeNull();
    fireEvent.click(getByRole('button', { name: 'Collapse Flow A' }));
    expect(onCollapseFlow).toHaveBeenCalledWith('flow-a');
  });
});
