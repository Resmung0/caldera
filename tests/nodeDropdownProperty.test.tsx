/**
 * @jest-environment jsdom
 */
import * as fc from 'fast-check';
import React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import { NodeDropdown } from '../src/webview/components/NodeDropdown';
import { List } from 'lucide-react';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, initial, animate, exit, transition, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('NodeDropdown - Task 10.3: Property Tests', () => {

    // Arbitrary for items (either array or object)
    const arbItems = fc.oneof(
        fc.array(fc.oneof(
            fc.string(),
            fc.record({ path: fc.string() })
        ), { minLength: 0, maxLength: 10 }),
        fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean()))
    );

    afterEach(() => {
        cleanup();
    });

    test('Property 9: Dropdown Expansion Behavior - All items are rendered', () => {
        fc.assert(
            fc.property(arbItems, fc.constantFrom('params', 'deps'), (items, variant) => {
                const { container } = render(
                    <NodeDropdown
                        icon={List}
                        label="Test"
                        isExpanded={true}
                        onToggle={() => { }}
                        items={items}
                        variant={variant as any}
                    />
                );

                const itemElements = container.querySelectorAll('.param-item');
                const expectedLength = Array.isArray(items) ? items.length : Object.keys(items).length;

                expect(itemElements.length).toBe(expectedLength);

                // Verify specific rendering logic based on format
                if (Array.isArray(items)) {
                    items.forEach((item, index) => {
                        if (item && typeof item === 'object' && 'path' in item) {
                            const filename = String(item.path).split('/').pop();
                            if (filename && filename.trim() !== "") {
                                const trimmed = filename.trim();
                                expect(screen.queryAllByText((content) => content.trim().includes(trimmed)).length).toBeGreaterThan(0);
                            }
                        } else if (String(item).trim() !== "") {
                            const trimmed = String(item).trim();
                            expect(screen.queryAllByText((content) => content.trim().includes(trimmed)).length).toBeGreaterThan(0);
                        }
                    });
                } else {
                    Object.entries(items).forEach(([key, val]) => {
                        const trimmedKey = key.trim();
                        if (trimmedKey !== "") {
                            expect(screen.queryAllByText((content) => content.trim().includes(trimmedKey)).length).toBeGreaterThan(0);
                        }
                        const valStr = String(val).trim();
                        if (valStr !== "" && typeof val !== 'object') {
                            expect(screen.queryAllByText((content) => content.trim().includes(valStr)).length).toBeGreaterThan(0);
                        }
                    });
                }

                cleanup();
            }),
            { numRuns: 50 } // Reducing runs for performance as it involves React rendering
        );
    });
});
