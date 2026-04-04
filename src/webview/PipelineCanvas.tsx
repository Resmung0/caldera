import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    NodeProps,
    applyNodeChanges,
    NodeChange,
    Node
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { PipelineData } from '../shared/types';
import { EmptyState } from './components/EmptyState';
import { AnnotatorButton } from './components/AnnotatorButton';
import { PatternSelector } from './components/PatternSelector';
import { AnnotationLayer } from './components/AnnotationLayer';
import { SelectionBox } from './components/SelectionBox';
import { TopPanel } from './components/TopPanel';
import { PipelineNodeItem } from './components/PipelineNodeItem';
import { SelectionBoxHandler } from './components/SelectionBoxHandler';
import { PipelineSelectorPanel } from './components/PipelineSelectorPanel';
import { AnimatedEdge } from './components/AnimatedEdge';
import {
    Camera,
    ArrowRightLeft,
    ArrowUpDown,
    Play,
    Square
} from 'lucide-react';
import { useSelection } from './hooks/useSelection';
import { useAnnotations } from './hooks/useAnnotations';
import { usePipelineRunner } from './hooks/usePipelineRunner';

const nodeWidth = 220;
const nodeHeight = 80;

// --- Layout Logic ---

const resolveOverlaps = (nodes: Node[], changes: NodeChange[]): Node[] => {
    const PADDING = 20;
    const draggingNodeIds = new Set(changes.filter(c => c.type === 'position' && (c as any).dragging).map(c => c.id));
    const resizingNodeIds = new Set(changes.filter(c => c.type === 'dimensions').map(c => c.id));
    
    // Create a copy for mutating
    const resolvedNodes = nodes.map(n => ({ ...n, position: { ...n.position } }));
    
    // We only resolve if there are actual width/height values
    const hasDimensions = resolvedNodes.every(n => n.width && n.height);
    if (!hasDimensions) return resolvedNodes;

    // Iterative relaxation
    for (let i = 0; i < 10; i++) {
        let hasOverlap = false;

        for (let j = 0; j < resolvedNodes.length; j++) {
            for (let k = j + 1; k < resolvedNodes.length; k++) {
                const nodeA = resolvedNodes[j];
                const nodeB = resolvedNodes[k];

                const wA = nodeA.width || 220;
                const hA = nodeA.height || 80;
                const wB = nodeB.width || 220;
                const hB = nodeB.height || 80;

                const centerA = { x: nodeA.position.x + wA / 2, y: nodeA.position.y + hA / 2 };
                const centerB = { x: nodeB.position.x + wB / 2, y: nodeB.position.y + hB / 2 };

                const dx = centerB.x - centerA.x;
                const dy = centerB.y - centerA.y;

                const minDx = (wA + wB) / 2 + PADDING;
                const minDy = (hA + hB) / 2 + PADDING;

                if (Math.abs(dx) < minDx && Math.abs(dy) < minDy) {
                    hasOverlap = true;
                    
                    const overlapX = minDx - Math.abs(dx);
                    const overlapY = minDy - Math.abs(dy);
                    
                    const isDraggingA = draggingNodeIds.has(nodeA.id);
                    const isDraggingB = draggingNodeIds.has(nodeB.id);
                    const isResizingA = resizingNodeIds.has(nodeA.id);
                    const isResizingB = resizingNodeIds.has(nodeB.id);

                    let ratioA = 0.5;
                    let ratioB = 0.5;
                    
                    if (isDraggingA && !isDraggingB) { ratioA = 0; ratioB = 1; }
                    else if (!isDraggingA && isDraggingB) { ratioA = 1; ratioB = 0; }
                    else if (isResizingA && !isResizingB) { ratioA = 0; ratioB = 1; }
                    else if (!isResizingA && isResizingB) { ratioA = 1; ratioB = 0; }

                    if (overlapX < overlapY) {
                        const shiftX = overlapX;
                        const dir = dx > 0 ? 1 : -1; 
                        
                        nodeA.position.x -= shiftX * ratioA * dir;
                        nodeB.position.x += shiftX * ratioB * dir;
                    } else {
                        const shiftY = overlapY;
                        const dir = dy > 0 ? 1 : -1;
                        
                        nodeA.position.y -= shiftY * ratioA * dir;
                        nodeB.position.y += shiftY * ratioB * dir;
                    }
                }
            }
        }
        if (!hasOverlap) break;
    }

    return resolvedNodes;
};

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
    if (nodes.length === 0) return { nodes: [], edges: [] };

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        const isArtifact = node.data?.type === 'artifact';
        const w = isArtifact ? 180 : nodeWidth;
        const h = isArtifact ? 36 : nodeHeight;
        dagreGraph.setNode(node.id, { width: w, height: h });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const isArtifact = node.data?.type === 'artifact';
        const w = isArtifact ? 180 : nodeWidth;
        const h = isArtifact ? 36 : nodeHeight;
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - w / 2,
                y: nodeWithPosition.y - h / 2,
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
    const [nodes, setNodes] = useNodesState([]);
    
    const handleNodesChange = useCallback((changes: NodeChange[]) => {
        setNodes((nds) => {
            const nextNodes = applyNodeChanges(changes, nds);
            const needsResolution = changes.some(c => c.type === 'position' || c.type === 'dimensions');
            if (needsResolution) {
                return resolveOverlaps(nextNodes as Node[], changes);
            }
            return nextNodes;
        });
    }, [setNodes]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');
    const [activeCategory, setActiveCategory] = useState<string>('cicd');

    const {
        selectionManager,
        selectionState,
        selectionBox,
        setSelectionBox,
        handleCanvasClick,
        toggleSelectionMode,
    } = useSelection(data.nodes);

    const {
        annotations,
        editingAnnotationId,
        selectorPosition,
        setSelectorPosition,
        handlePatternSelect,
        handleDeleteAnnotation,
        handleEditAnnotation,
    } = useAnnotations(onNotify, selectionManager);

    const handleCategorySelect = (category: string) => {
        setActiveCategory(category);
        onCategorySelect(category);
    };


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

    const edgeTypes = useMemo(
        () => ({
            animated: AnimatedEdge,
        }),
        []
    );

    const { runPipeline, stopPipeline, isRunning } = usePipelineRunner({
        nodes,
        edges,
        setNodes,
        setEdges,
        onNotify,
        stepDelay: 1500,
    });

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
            type: 'custom',
            data: {
                label: n.label,
                status: n.status,
                framework: data.framework,
                type: n.type,
                ...n.data
            },
            position: { x: 0, y: 0 },
        }));

        const initialEdges = data.edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            type: 'animated',
            data: { status: 'idle' },
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
                edgeTypes={edgeTypes}
                onNodesChange={handleNodesChange}
                onEdgesChange={onEdgesChange}
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
                    annotations={annotations}
                    isDarkTheme={true}
                    showLabels={true}
                    animationEnabled={true}
                    onDeleteAnnotation={handleDeleteAnnotation}
                    onEditAnnotation={handleEditAnnotation}
                />
                {selectionState.isSelectionMode && (
                    <>
                        <SelectionBoxHandler
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
                    <ControlButton
                        onClick={isRunning ? stopPipeline : runPipeline}
                        title={isRunning ? 'Stop Pipeline' : 'Run Pipeline'}
                    >
                        {isRunning ? <Square size={16} /> : <Play size={16} />}
                    </ControlButton>
                    <AnnotatorButton
                        isSelectionMode={selectionState.isSelectionMode}
                        onToggleSelectionMode={toggleSelectionMode}
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

                {selectionState.isSelectionMode && selectorPosition && (
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
                            onPatternSelect={
                                (patternType, patternSubtype) => handlePatternSelect(selectionState, patternType, patternSubtype)
                            }
                            disabled={!selectionState.selectedNodeIds.length && !editingAnnotationId}
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
