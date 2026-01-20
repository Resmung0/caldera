import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import ReactFlow, {
    Panel,
    Background,
    Controls,
    ControlButton,
    MiniMap,
    useNodesState,
    useEdgesState,
    useReactFlow,
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
}

export const PipelineCanvas: React.FC<PipelineCanvasProps> = ({ data, availablePipelines, onPipelineSelect, onCategorySelect }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');
    const [activeCategory, setActiveCategory] = useState<string>('cicd');

    // Selection management using SelectionManager
    const [selectionManager] = useState(() => new SelectionManager());
    const [selectionState, setSelectionState] = useState<SelectionState>(createInitialSelectionState());
    const [showPatternSelector, setShowPatternSelector] = useState(false);

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
    const [notification, setNotification] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

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
            setShowPatternSelector(false);
            setEditingAnnotationId(null);
        } else {
            selectionManager.activateSelectionMode();
            // Show PatternSelector immediately when entering annotation mode
            setShowPatternSelector(true);
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

                setNotification({
                    type: 'success',
                    message: `Updated annotation pattern to ${patternType}`
                });
                setTimeout(() => setNotification(null), 3000);

                setEditingAnnotationId(null);
                setShowPatternSelector(false);
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

                // Show success notification
                setNotification({
                    type: 'success',
                    message: `Created ${patternType} annotation with ${selectionState.selectedNodeIds.length} nodes`
                });

                // Clear notification after 3 seconds
                setTimeout(() => setNotification(null), 3000);

            } catch (error) {
                console.error('Failed to create annotation:', error);

                // Show error notification
                setNotification({
                    type: 'error',
                    message: `Failed to create annotation: ${error instanceof Error ? error.message : 'Unknown error'}`
                });

                // Clear notification after 5 seconds
                setTimeout(() => setNotification(null), 5000);
            }

            // Reset selection state through SelectionManager
            selectionManager.deactivateSelectionMode();
            setShowPatternSelector(false);
        }
    };

    const handleDeleteAnnotation = (id: string) => {
        if (annotationStore.deleteAnnotation(id)) {
            setNotification({
                type: 'success',
                message: 'Annotation deleted'
            });
            setTimeout(() => setNotification(null), 2000);
        }
    };

    const handleEditAnnotation = (id: string) => {
        const annotation = annotationStore.getAnnotation(id);
        if (annotation) {
            setEditingAnnotationId(id);
            selectionManager.activateSelectionMode();
            selectionManager.selectNodes(annotation.nodeIds);
            setShowPatternSelector(true);
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

                {showPatternSelector && selectionState.isSelectionMode && (
                    <Panel position="bottom-left" style={{ marginBottom: '60px', marginLeft: '60px' }}>
                        <div className="pattern-selector-panel">
                            <div className="panel-header">
                                <h3>{editingAnnotationId ? 'Modify Annotation' : 'Create Annotation'}</h3>
                                <p>
                                    {selectionState.selectedNodeIds.length > 0
                                        ? `Choose a pattern for the selected nodes (${selectionState.selectedNodeIds.length} selected)`
                                        : 'Select nodes by clicking or drawing a rectangle'}
                                </p>
                                {selectionState.selectedNodeIds.length > 0 && annotationStore.areNodesAnnotated(selectionState.selectedNodeIds) && (
                                    <div className="warning-message">
                                        ⚠️ {selectionState.selectedNodeIds.length === 1 ? 'This node is' : 'Some nodes are'} already annotated
                                    </div>
                                )}
                            </div>
                            <PatternSelector
                                onPatternSelect={handlePatternSelect}
                                disabled={false}
                            />
                            <div className="panel-actions">
                                <button
                                    className="cancel-button"
                                    onClick={() => {
                                        selectionManager.deactivateSelectionMode();
                                        setShowPatternSelector(false);
                                        setEditingAnnotationId(null);
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                        <style>{`
              .pattern-selector-panel {
                background: var(--color-bg-primary);
                border: 1px solid var(--color-border);
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 4px 12px var(--color-shadow);
                min-width: 280px;
                max-width: 320px;
              }
              
              .panel-header {
                margin-bottom: 12px;
              }
              
              .panel-header h3 {
                margin: 0 0 4px 0;
                font-size: 14px;
                font-weight: 600;
                color: var(--color-text-primary);
              }
              
              .panel-header p {
                margin: 0 0 8px 0;
                font-size: 12px;
                color: var(--color-text-secondary);
              }
              
              .warning-message {
                font-size: 11px;
                color: #f59e0b;
                background: rgba(245, 158, 11, 0.1);
                padding: 6px 8px;
                border-radius: 4px;
                margin-bottom: 8px;
              }
              
              .panel-actions {
                margin-top: 12px;
                display: flex;
                justify-content: flex-end;
              }
              
              .cancel-button {
                background: transparent;
                border: 1px solid var(--color-border);
                color: var(--color-text-secondary);
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s ease;
              }
              
              .cancel-button:hover {
                background: var(--color-bg-hover);
                color: var(--color-text-primary);
              }
            `}</style>
                    </Panel>
                )}

                {notification && (
                    <Panel position="top-right" style={{ marginTop: '60px', marginRight: '20px' }}>
                        <div className={`notification ${notification.type}`}>
                            <div className="notification-content">
                                {notification.type === 'success' ? '✅' : '❌'} {notification.message}
                            </div>
                            <button
                                className="notification-close"
                                onClick={() => setNotification(null)}
                            >
                                ×
                            </button>
                        </div>
                        <style>{`
              .notification {
                background: var(--color-bg-primary);
                border: 1px solid var(--color-border);
                border-radius: 8px;
                padding: 12px;
                box-shadow: 0 4px 12px var(--color-shadow);
                min-width: 250px;
                max-width: 350px;
                display: flex;
                align-items: center;
                gap: 8px;
              }
              
              .notification.success {
                border-left: 4px solid #10b981;
              }
              
              .notification.error {
                border-left: 4px solid #ef4444;
              }
              
              .notification-content {
                flex: 1;
                font-size: 12px;
                color: var(--color-text-primary);
                line-height: 1.4;
              }
              
              .notification-close {
                background: transparent;
                border: none;
                color: var(--color-text-secondary);
                font-size: 16px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 2px;
                transition: all 0.2s ease;
              }
              
              .notification-close:hover {
                background: var(--color-bg-hover);
                color: var(--color-text-primary);
              }
            `}</style>
                    </Panel>
                )}

                {selectionState.isSelectionMode && (
                    <Panel position="top-left" style={{ marginTop: '60px', marginLeft: '20px' }}>
                        <div className="selection-status-panel">
                            <div className="selection-status">
                                <div className="status-indicator active"></div>
                                <span className="status-text">Selection Mode</span>
                            </div>
                            <div className="selection-count">
                                {selectionState.selectedNodeIds.length} node{selectionState.selectedNodeIds.length !== 1 ? 's' : ''} selected
                            </div>
                            <div className="annotation-info">
                                {annotationStore.getAllAnnotations().length} annotation{annotationStore.getAllAnnotations().length !== 1 ? 's' : ''} total
                            </div>
                            <div className="selection-help">
                                <div>Click nodes to select • Drag to select multiple</div>
                                <div>Ctrl+A to select all • Esc to exit • Del to clear</div>
                                {selectionState.selectedNodeIds.length > 0 && canCreateAnnotation && (
                                    <div className="create-hint">Select pattern below to create annotation</div>
                                )}
                            </div>
                        </div>
                        <style>{`
              .selection-status-panel {
                background: var(--color-bg-primary);
                border: 1px solid var(--color-border);
                border-radius: 8px;
                padding: 12px;
                box-shadow: 0 4px 12px var(--color-shadow);
                min-width: 200px;
              }
              
              .selection-status {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
              }
              
              .status-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #f20d63;
                animation: statusPulse 2s infinite;
              }
              
              @keyframes statusPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
              
              .status-text {
                font-size: 12px;
                font-weight: 600;
                color: var(--color-text-primary);
              }
              
              .selection-count {
                font-size: 11px;
                color: var(--color-text-secondary);
                margin-bottom: 4px;
              }
              
              .annotation-info {
                font-size: 11px;
                color: var(--color-text-secondary);
                margin-bottom: 8px;
                font-style: italic;
              }
              
              .selection-help {
                font-size: 10px;
                color: var(--color-text-secondary);
                line-height: 1.3;
              }
              
              .create-hint {
                color: #f20d63 !important;
                font-weight: 500;
                margin-top: 4px;
              }
            `}</style>
                    </Panel>
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
