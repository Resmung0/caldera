/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import { PipelinePatternType } from '../src/shared/types';
import AnnotationItem from '../src/webview/components/AnnotationItem';

describe('Prefect Flow annotation rendering', () => {
  it('uses the existing annotation boundary in pink without user annotation actions', () => {
    const { container, getByText } = render(
      <AnnotationItem
        annotation={{
          id: 'prefect-flow:flow-a',
          nodeIds: ['flow-a', 'task-a'],
          patternType: PipelinePatternType.DATA_PROCESSING,
          patternSubtype: 'flow',
          color: '#f20d63',
          label: 'Flow: Flow A',
          source: 'prefect-flow',
          createdAt: new Date(0),
          modifiedAt: new Date(0),
        }}
        bounds={{ x: 0, y: 0, width: 400, height: 240, padding: 16 }}
        index={0}
      />
    );

    const boundary = container.querySelector('.annotation-boundary') as HTMLElement;
    expect(boundary.style.borderColor).toBe('rgb(242, 13, 99)');
    expect(getByText('Flow: Flow A')).not.toBeNull();
    expect(container.querySelector('.annotation-icon-container svg')).not.toBeNull();
    expect(container.querySelector('.annotation-actions')).toBeNull();
  });
});
