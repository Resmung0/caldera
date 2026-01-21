import React, { useRef, useEffect } from 'react';
import { useReactFlow } from 'reactflow';
import { SelectionState } from '../../shared/types';
import { SelectionManager } from '../../shared/SelectionManager';

interface SelectionBoxHandlerProps {
    selectionManager: SelectionManager;
    selectionState: SelectionState;
    onSelectionBoxChange: (box: { startX: number; startY: number; endX: number; endY: number } | null) => void;
    onNodesSelected: (nodeIds: string[]) => void;
    onSelectionEnd?: (position: { x: number; y: number }) => void;
}

export const SelectionBoxHandler: React.FC<SelectionBoxHandlerProps> = ({
    selectionState,
    onSelectionBoxChange,
    onNodesSelected,
    onSelectionEnd
}) => {
    const { screenToFlowPosition, getViewport, getNodes } = useReactFlow();
    const isDragging = useRef(false);
    const wasDragging = useRef(false);
    const selectionBoxStart = useRef<{ x: number; y: number } | null>(null);

    // Prevent click event from clearing selection after a drag
    useEffect(() => {
        const handleWindowClick = (event: MouseEvent) => {
            if (wasDragging.current) {
                event.stopPropagation();
                event.stopImmediatePropagation();
                wasDragging.current = false;
            }
        };

        window.addEventListener('click', handleWindowClick, { capture: true });
        return () => window.removeEventListener('click', handleWindowClick, { capture: true });
    }, []);

    // Attach mouse down listener to pane
    useEffect(() => {
        if (!selectionState.isSelectionMode) return;

        const handlePaneMouseDown = (event: Event) => {
            const mouseEvent = event as MouseEvent;
            const target = mouseEvent.target as HTMLElement;

            // Don't start selection if clicking on nodes, controls or panels
            if (target.closest('.react-flow__node')) return;
            if (target.closest('.react-flow__controls')) return;
            if (target.closest('.react-flow__panel')) return;
            if (!target.closest('.react-flow__pane')) return;

            if (mouseEvent.button === 0) {
                // Stop event propagation to prevent React Flow from handling it (like panning)
                mouseEvent.stopPropagation();

                const pane = document.querySelector('.react-flow__pane');
                if (!pane) return;
                const rect = pane.getBoundingClientRect();

                const relX = mouseEvent.clientX - rect.left;
                const relY = mouseEvent.clientY - rect.top;

                isDragging.current = true;
                selectionBoxStart.current = { x: mouseEvent.clientX, y: mouseEvent.clientY };

                onSelectionBoxChange({
                    startX: relX,
                    startY: relY,
                    endX: relX,
                    endY: relY,
                });
            }
        };

        const pane = document.querySelector('.react-flow__pane');
        if (pane) {
            pane.addEventListener('mousedown', handlePaneMouseDown);
            return () => {
                pane.removeEventListener('mousedown', handlePaneMouseDown);
            };
        }
    }, [selectionState.isSelectionMode, screenToFlowPosition, onSelectionBoxChange]);

    // Global mouse handlers for selection box
    useEffect(() => {
        if (!selectionState.isSelectionMode) return;

        const handleGlobalMouseMove = (event: MouseEvent) => {
            if (isDragging.current && selectionBoxStart.current) {
                const pane = document.querySelector('.react-flow__pane');
                if (!pane) return;
                const rect = pane.getBoundingClientRect();

                const startRelX = selectionBoxStart.current.x - rect.left;
                const startRelY = selectionBoxStart.current.y - rect.top;
                const currentRelX = event.clientX - rect.left;
                const currentRelY = event.clientY - rect.top;

                onSelectionBoxChange({
                    startX: startRelX,
                    startY: startRelY,
                    endX: currentRelX,
                    endY: currentRelY,
                });
            }
        };

        const handleGlobalMouseUp = (event: MouseEvent) => {
            if (isDragging.current && selectionBoxStart.current) {
                const startFlow = screenToFlowPosition({
                    x: selectionBoxStart.current.x,
                    y: selectionBoxStart.current.y
                });
                const endFlow = screenToFlowPosition({
                    x: event.clientX,
                    y: event.clientY
                });

                const allNodes = getNodes();

                const minX = Math.min(startFlow.x, endFlow.x);
                const maxX = Math.max(startFlow.x, endFlow.x);
                const minY = Math.min(startFlow.y, endFlow.y);
                const maxY = Math.max(startFlow.y, endFlow.y);

                const nodesInBox: string[] = [];
                allNodes.forEach(node => {
                    const nodeX = node.position.x;
                    const nodeY = node.position.y;
                    // Use predefined node dimensions
                    const nodeWidth = node.width || 200;
                    const nodeHeight = node.height || 80;
                    const nodeRight = nodeX + nodeWidth;
                    const nodeBottom = nodeY + nodeHeight;

                    // Check if node bounding box intersects with selection box
                    if (!(nodeRight < minX || nodeX > maxX || nodeBottom < minY || nodeY > maxY)) {
                        nodesInBox.push(node.id);
                    }
                });

                if (nodesInBox.length > 0) {
                    onNodesSelected(nodesInBox);
                    
                    // Calculate center-top position of selected nodes for the pattern selector
                    const selectedNodes = allNodes.filter(n => nodesInBox.includes(n.id));
                    let selectorPos = { x: event.clientX, y: event.clientY };

                    if (selectedNodes.length > 0) {
                        const minX = Math.min(...selectedNodes.map(n => n.position.x));
                        const maxX = Math.max(...selectedNodes.map(n => n.position.x + (n.width || 200)));
                        const minY = Math.min(...selectedNodes.map(n => n.position.y));
                        
                        const flowCenter = {
                            x: (minX + maxX) / 2,
                            y: minY
                        };
                        
                        // Manual conversion from Flow to Screen coordinates
                        // Screen = Flow * Zoom + Viewport + PaneOffset
                        const pane = document.querySelector('.react-flow__pane');
                        if (pane) {
                            const rect = pane.getBoundingClientRect();
                            const { x: vpX, y: vpY, zoom } = getViewport();
                            
                            selectorPos = {
                                x: (flowCenter.x * zoom) + vpX + rect.left,
                                y: (flowCenter.y * zoom) + vpY + rect.top
                            };
                        }
                    }

                    onSelectionEnd?.(selectorPos);

                    // Prevent the subsequent click from clearing the selection
                    wasDragging.current = true;
                    // Safety timeout in case click doesn't fire
                    setTimeout(() => { wasDragging.current = false; }, 100);
                } else {
                    // Clear selection if no nodes are in the box
                    onNodesSelected([]);
                    onSelectionBoxChange(null);
                }

                isDragging.current = false;
                selectionBoxStart.current = null;
            }
        };

        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [selectionState.isSelectionMode, getNodes, onNodesSelected, onSelectionBoxChange, screenToFlowPosition]);

    return null;
};
