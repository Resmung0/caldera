/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeDropdown } from '../src/webview/components/NodeDropdown';
import { List } from 'lucide-react';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, initial, animate, exit, transition, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('NodeDropdown - Task 10.4: Unit Tests', () => {
    const mockOnToggle = jest.fn();

    const defaultProps = {
        icon: List,
        label: 'Test Dropdown',
        isExpanded: false,
        onToggle: mockOnToggle,
        items: { key1: 'val1', key2: 'val2' },
        variant: 'params' as const
    };

    beforeEach(() => {
        mockOnToggle.mockClear();
    });

    test('renders badge with icon and label', () => {
        render(<NodeDropdown {...defaultProps} />);

        expect(screen.queryByText('Test Dropdown')).not.toBeNull();
        // Lucide icon should be present (rendered as svg or div depending on environment/mocking)
        expect(screen.getByText('Test Dropdown').parentElement?.querySelector('svg')).not.toBeNull();
    });

    test('shows dropdown panel when expanded', () => {
        render(<NodeDropdown {...defaultProps} isExpanded={true} />);

        expect(screen.queryByText('key1:')).not.toBeNull();
        expect(screen.queryByText('val1')).not.toBeNull();
        expect(screen.queryByText('key2:')).not.toBeNull();
        expect(screen.queryByText('val2')).not.toBeNull();
    });

    test('hides dropdown panel when collapsed', () => {
        render(<NodeDropdown {...defaultProps} isExpanded={false} />);

        expect(screen.queryByText('key1:')).toBeNull();
        expect(screen.queryByText('val1')).toBeNull();
    });

    test('renders key-value pairs correctly', () => {
        render(<NodeDropdown {...defaultProps} isExpanded={true} />);

        expect(screen.getByText('key1:')).not.toBeNull();
        expect(screen.getByTitle('val1')).not.toBeNull();
    });

    test('renders simple list items correctly', () => {
        const listProps = {
            ...defaultProps,
            isExpanded: true,
            items: ['itemA', 'itemB']
        };
        render(<NodeDropdown {...listProps} />);

        // items.map split('/') etc logic:
        // const displayKey = item && item.path ? item.path.split('/').pop() : String(index + 1);
        expect(screen.queryByText('1')).not.toBeNull();
        expect(screen.queryByText('itemA')).not.toBeNull();
        expect(screen.queryByText('2')).not.toBeNull();
        expect(screen.queryByText('itemB')).not.toBeNull();
    });

    test('renders list items with paths correctly', () => {
        const listProps = {
            ...defaultProps,
            isExpanded: true,
            items: [{ path: 'src/utils/tool.ts' }]
        };
        render(<NodeDropdown {...listProps} />);

        expect(screen.queryByText('tool.ts')).not.toBeNull();
        expect(screen.getByTitle('src/utils/tool.ts')).not.toBeNull();
    });

    test('applies correct variant styling', () => {
        const { rerender } = render(<NodeDropdown {...defaultProps} variant="params" />);
        expect(screen.getByText('Test Dropdown').parentElement?.classList.contains('params-badge')).toBe(true);

        rerender(<NodeDropdown {...defaultProps} variant="deps" />);
        expect(screen.getByText('Test Dropdown').parentElement?.classList.contains('deps-badge')).toBe(true);
    });

    test('calls onToggle when clicked', () => {
        render(<NodeDropdown {...defaultProps} />);
        const badge = screen.getByText('Test Dropdown').parentElement as HTMLElement;
        fireEvent.click(badge);

        expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });
});
