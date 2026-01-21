import React, { useCallback, useEffect, useMemo, useState} from 'react';
import { toPng } from 'html-to-image';
import ReactFlow, {
    Background,
    Controls,
    ControlButton,
    MiniMap,
    useNodesState,
    useEdgesState,
    ConnectionLineType,
    MarkerType,
    NodeProps
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { PipelineData, PipelinePatternType, SelectionState } from '../shared/types';
import { EmptyState } from './EmptyState';
import { AnnotatorButton } from './components/AnnotatorButton';
import { PatternSelector } from './components/PatternSelector';
import { AnnotationLayer } from './components/AnnotationLayer';
import { SelectionBox } from './components/SelectionBox';
import { TopPanel } from './components/TopPanel';
import { PipelineNodeItem } from './components/PipelineNodeItem';
import { SelectionBoxHandler } from './components/SelectionBoxHandler';
import { PipelineSelectorPanel } from './components/PipelineSelectorPanel';
import { createInitialSelectionState } from '../shared/annotationUtils';
import { SelectionManager } from '../shared/SelectionManager';
import { AnnotationStore } from '../shared/AnnotationStore';
import {
    Camera,
    ArrowRightLeft,
    ArrowUpDown
} from 'lucide-react';

const nodeWidth = 220;
const nodeHeight = 80;

// --- Layout Logic ---

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
    if (nodes.length === 0) return { nodes: [], edges: [] };

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

// --- Main Canvas ---

interface PipelineCanvasProps {
    data: PipelineData;
    availablePipelines: string[];
    onPipelineSelect: (filePath: string) => void;
    onCategorySelect: (category: string) => void;
    onNotify: (type: 'info' | 'error' | 'warning', message: string) => void;
}

export const PipelineCanvas: React.FC<PipelineCanvasProps> = ({ data, availablePipelines, onPipelineSelect, onCategorySelect, onNotify }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');
    const [activeCategory, setActiveCategory] = useState<string>('cicd');

    // Selection management using SelectionManager
    const [selectionManager] = useState(() => new SelectionManager());
    const [selectionState, setSelectionState] = useState<SelectionState>(createInitialSelectionState());
    const [showPatternSelector, setShowPatternSelector] = useState(false);
    const [selectorPosition, setSelectorPosition] = useState<{ x: number, y: number } | null>(null);

    // Selection box state for drag selection
    const [selectionBox, setSelectionBox] = useState<{
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    } | null>(null);

    // Annotation management using AnnotationStore
    const [annotationStore] = useState(() => new AnnotationStore());
    const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);

    const handleCategorySelect = (category: string) => {
        setActiveCategory(category);
        onCategorySelect(category);
    };

    // Subscribe to selection manager changes
    useEffect(() => {
        const unsubscribe = selectionManager.subscribe((selectedNodeIds, isSelectionMode) => {
            setSelectionState(prev => ({
                ...prev,
                selectedNodeIds,
                isSelectionMode
            }));
        });

        return unsubscribe;
    }, [selectionManager]);

    // Subscribe to annotation store changes
    useEffect(() => {
        const unsubscribe = annotationStore.subscribe((annotationState) => {
            // Update any UI that depends on annotation state
            console.log('Annotation state updated:', annotationState.annotations.size, 'annotations');
        });

        return unsubscribe;
    }, [annotationStore]);

    useEffect(() => {
        if (selectionState.isSelectionMode && selectionState.selectedNodeIds.length > 0) {
            setShowPatternSelector(true);
        } else {
            setShowPatternSelector(false);
            setSelectorPosition(null);
        }
    }, [selectionState.isSelectionMode, selectionState.selectedNodeIds]);

    // Update selection manager when nodes change
    useEffect(() => {
        if (data.nodes.length > 0) {
            selectionManager.setAvailableNodes(data.nodes);
        }
    }, [data.nodes, selectionManager]);

    // Annotation mode handlers
    const handleToggleSelectionMode = () => {
        if (selectionState.isSelectionMode) {
            selectionManager.deactivateSelectionMode();
            setEditingAnnotationId(null);
            setSelectionBox(null);
        } else {
            setSelectionBox(null);
            selectionManager.activateSelectionMode();
        }
    };

    const handleNodeClick = useCallback((event: React.MouseEvent, node: any) => {
        // Selection is now handled exclusively by the selection box (rectangle selection)
        // Individual node clicking in selection mode won't toggle selection anymore
        if (selectionState.isSelectionMode) {
            event.stopPropagation();
        }
    }, [selectionState.isSelectionMode]);

    const handlePatternSelect = (patternType: PipelinePatternType, patternSubtype: string) => {
        if (editingAnnotationId) {
            try {
                annotationStore.updateAnnotation(editingAnnotationId, {
                    patternType,
                    patternSubtype,
                    color: (annotationStore as any).getColorForPattern(patternType, patternSubtype) // Accessing private for quick fix or use a shared util if available
                });

                onNotify('info', `Updated annotation pattern to ${patternType}`);

                setEditingAnnotationId(null);
                selectionManager.deactivateSelectionMode();
            } catch (error) {
                console.error('Failed to update annotation:', error);
            }
            return;
        }

        if (selectionState.selectedNodeIds.length > 0) {
            try {
                // Create the annotation using AnnotationStore
                const annotationId = annotationStore.createAnnotation(
                    selectionState.selectedNodeIds,
                    patternType,
                    patternSubtype
                );

                console.log('Created annotation:', annotationId, {
                    nodeIds: selectionState.selectedNodeIds,
                    patternType,
                    patternSubtype
                });

                onNotify('info', `Created ${patternType} annotation with ${selectionState.selectedNodeIds.length} nodes`);

            } catch (error) {
                console.error('Failed to create annotation:', error);

                onNotify('error', `Failed to create annotation: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            // Reset selection state through SelectionManager
            selectionManager.deactivateSelectionMode();
        }
    };

    const handleDeleteAnnotation = (id: string) => {
        if (annotationStore.deleteAnnotation(id)) {
            onNotify('info', 'Annotation deleted');
        }
    };

    const handleEditAnnotation = (id: string, position: { x: number, y: number }) => {
        const annotation = annotationStore.getAnnotation(id);
        if (annotation) {
            setEditingAnnotationId(id);
            setSelectorPosition(position);
            selectionManager.activateSelectionMode();
            selectionManager.selectNodes(annotation.nodeIds);
        }
    };

    // Keep PatternSelector visible when in selection mode (showPatternSelector is now controlled by handleToggleSelectionMode)
    // Remove the old effect that hid it when no nodes were selected

    // Validate annotation creation
    const canCreateAnnotation = useMemo(() => {
        return selectionState.isSelectionMode &&
            selectionState.selectedNodeIds.length > 0 &&
            selectionState.selectedNodeIds.every(nodeId =>
                data.nodes.some(node => node.id === nodeId)
            );
    }, [selectionState.isSelectionMode, selectionState.selectedNodeIds, data.nodes]);

    // Handle canvas click to clear selection when not clicking on nodes
    const handleCanvasClick = useCallback((event: React.MouseEvent) => {
        if (selectionState.isSelectionMode && event.target === event.currentTarget) {
            selectionManager.clearSelection();
            setSelectionBox(null);
        }
    }, [selectionState.isSelectionMode, selectionManager]);


    // Keyboard shortcuts for selection operations
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!selectionState.isSelectionMode) return;

            switch (event.key) {
                case 'Escape':
                    event.preventDefault();
                    selectionManager.deactivateSelectionMode();
                    break;
                case 'a':
                case 'A':
                    if (event.ctrlKey || event.metaKey) {
                        event.preventDefault();
                        try {
                            selectionManager.selectAllNodes();
                        } catch (error) {
                            console.error('Error selecting all nodes:', error);
                        }
                    }
                    break;
                case 'Delete':
                case 'Backspace':
                    event.preventDefault();
                    selectionManager.clearSelection();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectionState.isSelectionMode, selectionManager]);

    const toggleLayoutDirection = useCallback(() => {
        setLayoutDirection((prevDirection) => (prevDirection === 'TB' ? 'LR' : 'TB'));
    }, []);

    const nodeTypes = useMemo(
        () => ({
            custom: (props: NodeProps) => (
                <PipelineNodeItem
                    {...props}
                    data={{
                        ...props.data,
                        layoutDirection,
                        isSelectionMode: selectionState.isSelectionMode,
                        isSelected: selectionState.selectedNodeIds.includes(props.id)
                    }}
                />
            ),
        }),
        [layoutDirection, selectionState.isSelectionMode, selectionState.selectedNodeIds]
    );

    const handleExportPNG = () => {
        const reactFlowElement = document.querySelector('.react-flow');
        if (reactFlowElement) {
            const computedStyle = getComputedStyle(reactFlowElement);
            const backgroundColor = computedStyle.backgroundColor;
            toPng(reactFlowElement as HTMLElement, {
                backgroundColor: backgroundColor || '#181B28',
                width: reactFlowElement.scrollWidth,
                height: reactFlowElement.scrollHeight,
            }).then((dataUrl) => {
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = 'pipeline.png';
                a.click();
            });
        }
    };

    const nodeColor = useCallback(() => '#f20d63', []);

    // Update activeCategory when data.category changes (from extension)
    useEffect(() => {
        if (data.category && data.category !== activeCategory) {
            setActiveCategory(data.category);
        }
    }, [data.category, activeCategory]);

    useEffect(() => {
        const initialNodes = data.nodes.map(n => ({
            id: n.id,
            type: 'custom', // Use our custom node
            data: {
                label: n.label,
                status: n.status,
                framework: data.framework // Pass framework to node
            },
            position: { x: 0, y: 0 },
        }));

        const initialEdges = data.edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            animated: true,
            style: { stroke: '#474c60', strokeWidth: 2 },
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#474c60',
                width: 12,
                height: 12,
            },
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            initialNodes,
            initialEdges,
            layoutDirection
        );

        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
    }, [data, setNodes, setEdges, layoutDirection]);

    // Handle empty state
    if (data.nodes.length === 0) {
        // If category and tools are provided, it means a scan was completed with no results
        if (data.category && data.tools) {
            return (
                <div style={{
                    width: '100%',
                    height: '100vh',
                    background: 'var(--color-bg-tertiary)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <TopPanel onCategorySelect={handleCategorySelect} activeCategory={activeCategory} />
                    <EmptyState category={data.category} tools={data.tools} />
                </div>
            );
        }

        // Default "waiting" screen on initial load
        return (
            <div style={{
                width: '100%',
                height: '100vh',
                background: 'var(--color-bg-tertiary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-primary)'
            }}>
                <TopPanel onCategorySelect={handleCategorySelect} activeCategory={activeCategory} />
                <div style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }}>📊</div>
                <div style={{ marginTop: '0.5rem', color: '#666' }}>
                    Waiting for pipeline data...
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100vh', background: 'var(--color-bg-tertiary)' }}>
            <TopPanel onCategorySelect={handleCategorySelect} activeCategory={activeCategory} />

            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onPaneClick={handleCanvasClick}
                panOnDrag={!selectionState.isSelectionMode}
                selectionMode={null as any} // Disable default selection box to use our custom one
                onNodeMouseEnter={(_, node) => {
                    if (!selectionState.isSelectionMode) {
                        setEdges((eds) => eds.map(e => {
                            if (e.source === node.id || e.target === node.id) {
                                const currentMarker = typeof e.markerEnd === 'object' ? e.markerEnd : { type: MarkerType.ArrowClosed };
                                return {
                                    ...e,
                                    style: { stroke: '#f20d63', strokeWidth: 3, filter: 'drop-shadow(0 0 4px #f20d63)' },
                                    animated: true,
                                    markerEnd: { ...currentMarker, color: '#f20d63' }
                                };
                            }
                            return e;
                        }));
                    }
                }}
                onNodeMouseLeave={() => {
                    if (!selectionState.isSelectionMode) {
                        setEdges((eds) => eds.map(e => {
                            const currentMarker = typeof e.markerEnd === 'object' ? e.markerEnd : { type: MarkerType.ArrowClosed };
                            return {
                                ...e,
                                style: { stroke: '#474c60', strokeWidth: 2 },
                                animated: true,
                                markerEnd: { ...currentMarker, color: '#474c60' }
                            };
                        }));
                    }
                }}
                connectionLineType={ConnectionLineType.SmoothStep}
                fitView
            >
                <Background color="var(--color-bg-secondary)" gap={20} size={1} />
                <AnnotationLayer
                    annotations={annotationStore.getAllAnnotations()}
                    isDarkTheme={true}
                    showLabels={true}
                    animationEnabled={true}
                    onDeleteAnnotation={handleDeleteAnnotation}
                    onEditAnnotation={handleEditAnnotation}
                />
                {selectionState.isSelectionMode && (
                    <>
                        <SelectionBoxHandler
                            selectionManager={selectionManager}
                            selectionState={selectionState}
                            onSelectionBoxChange={setSelectionBox}
                            onNodesSelected={(nodeIds) => {
                                try {
                                    selectionManager.selectNodes(nodeIds);
                                } catch (error) {
                                    console.error('Error selecting nodes in area:', error);
                                }
                            }}
                            onSelectionEnd={(pos) => setSelectorPosition(pos)}
                        />
                        {selectionBox && <SelectionBox selectionBox={selectionBox} />}
                    </>
                )}
                <Controls>
                    <AnnotatorButton
                        isSelectionMode={selectionState.isSelectionMode}
                        onToggleSelectionMode={handleToggleSelectionMode}
                    />
                    <ControlButton onClick={toggleLayoutDirection} title="Toggle Orientation">
                        {layoutDirection === 'TB' ? <ArrowRightLeft size={16} /> : <ArrowUpDown size={16} />}
                    </ControlButton>
                    <ControlButton onClick={handleExportPNG} title="Export as PNG">
                        <Camera size={16} />
                    </ControlButton>
                </Controls>
                <MiniMap
                    pannable
                    zoomable
                    nodeStrokeWidth={3}
                    nodeColor={nodeColor}
                    maskColor="rgba(24, 27, 40, 0.6)"
                    style={{ width: 100, height: 70 }}
                />
                <PipelineSelectorPanel
                    availablePipelines={availablePipelines}
                    onPipelineSelect={onPipelineSelect}
                    currentPipeline={data.filePath}
                />

                {showPatternSelector && selectionState.isSelectionMode && selectorPosition && (
                    <div
                        className="floating-pattern-selector"
                        style={{
                            position: 'fixed',
                            left: selectorPosition.x,
                            top: selectorPosition.y,
                            zIndex: 2000,
                            pointerEvents: 'auto',
                            transform: 'translate(-50%, -100%)',
                            marginTop: '-12px'
                        }}
                    >
                        <PatternSelector
                            onPatternSelect={handlePatternSelect}
                            disabled={false}
                            activeCategory={activeCategory}
                        />
                    </div>
                )}




            </ReactFlow>

            <style>{`
        .react-flow__edge.active .react-flow__edge-path {
          stroke: #f20d63 !important;
          stroke-width: 3;
        }

        .react-flow__pane {
          cursor: ${selectionState.isSelectionMode ? 'crosshair' : 'grab'} !important;
        }

        .react-flow__pane:active {
          cursor: ${selectionState.isSelectionMode ? 'crosshair' : 'grabbing'} !important;
        }
      `}</style>
        </div>
    );
};
