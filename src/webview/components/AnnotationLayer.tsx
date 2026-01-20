import React, { useMemo } from 'react';
import { useReactFlow, useViewport } from 'reactflow';
import { PipelineAnnotation, AnnotationBounds, PipelinePatternType } from '../../shared/types';
import {
  Workflow,
  Database,
  Sparkle,
  Bot,
  Type,
  Trash2,
  Settings2
} from 'lucide-react';

interface AnnotationLayerProps {
  annotations: PipelineAnnotation[];
  isDarkTheme?: boolean;
  showLabels?: boolean;
  animationEnabled?: boolean;
  onDeleteAnnotation?: (id: string) => void;
  onEditAnnotation?: (id: string) => void;
}

/**
 * AnnotationLayer component renders visual annotations as overlays on the PipelineCanvas.
 * It handles z-index management, responsive rendering, and proper layering without obscuring content.
 * 
 * Requirements addressed:
 * - 4.1: Render colored boundary around grouped nodes
 * - 4.4: Render annotations without obscuring node content or connections
 */
export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  annotations,
  isDarkTheme = true,
  showLabels = true,
  animationEnabled = true,
  onDeleteAnnotation,
  onEditAnnotation
}) => {
  const { getNodes } = useReactFlow();
  const { x: viewportX, y: viewportY, zoom } = useViewport();

  /**
   * Calculate the bounding box for a group of nodes with padding
   */
  const calculateAnnotationBounds = (nodeIds: string[]): AnnotationBounds | null => {
    const nodes = getNodes();
    const annotationNodes = nodes.filter(node => nodeIds.includes(node.id));

    if (annotationNodes.length === 0) {
      return null;
    }

    // Calculate the bounding rectangle that encompasses all selected nodes
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    annotationNodes.forEach(node => {
      const nodeX = node.position.x;
      const nodeY = node.position.y;
      const nodeWidth = node.width || 220; // Default node width
      const nodeHeight = node.height || 80; // Default node height

      minX = Math.min(minX, nodeX);
      minY = Math.min(minY, nodeY);
      maxX = Math.max(maxX, nodeX + nodeWidth);
      maxY = Math.max(maxY, nodeY + nodeHeight);
    });

    const padding = 16; // Padding around the grouped nodes

    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + (padding * 2),
      height: maxY - minY + (padding * 2),
      padding
    };
  };

  /**
   * Memoized annotation bounds calculation for performance
   */
  const annotationBounds = useMemo(() => {
    return annotations.map(annotation => ({
      annotation,
      bounds: calculateAnnotationBounds(annotation.nodeIds)
    })).filter(item => item.bounds !== null);
  }, [annotations, getNodes]);

  /**
   * Get z-index for annotation to handle overlapping scenarios
   */
  const getAnnotationZIndex = (index: number): number => {
    // Base z-index for annotations (below controls but above canvas background)
    const baseZIndex = 10;
    return baseZIndex + index;
  };

  /**
   * Get the appropriate icon for a pattern type
   */
  const getPatternIcon = (type: PipelinePatternType) => {
    switch (type) {
      case PipelinePatternType.CICD: return Workflow;
      case PipelinePatternType.DATA_PROCESSING: return Database;
      case PipelinePatternType.AI_AGENT: return Sparkle;
      case PipelinePatternType.RPA: return Bot;
      default: return Type;
    }
  };

  /**
   * Render individual annotation boundary
   */
  const renderAnnotation = (
    annotation: PipelineAnnotation,
    bounds: AnnotationBounds,
    index: number
  ) => {
    const zIndex = getAnnotationZIndex(index);
    const Icon = getPatternIcon(annotation.patternType);

    return (
      <div
        key={annotation.id}
        className={`annotation-boundary ${animationEnabled ? 'animated' : ''}`}
        style={{
          position: 'absolute',
          left: bounds.x,
          top: bounds.y,
          width: bounds.width,
          height: bounds.height,
          border: `2px solid ${annotation.color}`,
          borderRadius: '12px',
          backgroundColor: `${annotation.color}10`, // Slightly more transparent
          pointerEvents: 'none',
          zIndex,
          boxShadow: `0 0 12px ${annotation.color}30`,
          transition: animationEnabled ? 'all 0.3s ease' : 'none',
        }}
      >
        {/* Pointer-events: auto area for hover detection and buttons */}
        <div style={{
          position: 'absolute',
          inset: -4, // Slighly larger than boundary to catch hovers easily
          pointerEvents: 'auto',
          zIndex: -1
        }} />

        {/* Action Buttons in top-right corner */}
        <div
          className="annotation-actions"
          style={{
            position: 'absolute',
            top: -12,
            right: 8,
            display: 'flex',
            gap: '6px',
            pointerEvents: 'auto',
            zIndex: zIndex + 3,
            opacity: 0,
            transition: 'opacity 0.2s ease'
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditAnnotation?.(annotation.id);
            }}
            title="Edit Pattern"
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: 'rgba(30, 32, 49, 0.95)',
              border: `1px solid ${annotation.color}`,
              color: annotation.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            <Settings2 size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteAnnotation?.(annotation.id);
            }}
            title="Delete Annotation"
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: 'rgba(30, 32, 49, 0.95)',
              border: `1px solid #ef4444`,
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>

        {/* Pattern Icon in top-left corner */}
        <div
          className="annotation-icon-container"
          style={{
            position: 'absolute',
            top: -12,
            left: -12,
            width: 28,
            height: 28,
            backgroundColor: 'rgba(30, 32, 49, 0.95)',
            border: `2px solid ${annotation.color}`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: annotation.color,
            boxShadow: `0 2px 8px ${annotation.color}40`,
            zIndex: zIndex + 2
          }}
        >
          <Icon size={14} strokeWidth={2.5} />
        </div>

        {showLabels && (annotation.label || annotation.patternSubtype) && (
          <div
            className="annotation-label"
            style={{
              position: 'absolute',
              top: -24,
              left: 20, // Offset to avoid overlapping with icon
              backgroundColor: annotation.color,
              color: '#ffffff',
              padding: '2px 8px 2px 12px',
              borderRadius: '0 4px 4px 0',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              zIndex: zIndex + 1
            }}
          >
            {annotation.label || annotation.patternSubtype.replace(/-/g, ' ')}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="annotation-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 0, // Container doesn't need size if children are absolute
        height: 0,
        pointerEvents: 'none',
        zIndex: 5,
        transform: `translate(${viewportX}px, ${viewportY}px) scale(${zoom})`,
        transformOrigin: '0 0'
      }}
    >
      {annotationBounds.map(({ annotation, bounds }, index) =>
        bounds && renderAnnotation(annotation, bounds, index)
      )}

      <style>{`
        .annotation-boundary:hover .annotation-actions {
          opacity: 1 !important;
        }

        .annotation-actions button:hover {
          transform: scale(1.1);
          filter: brightness(1.2);
        }

        .annotation-boundary.animated:hover {
          transform: scale(1.01);
          box-shadow: 0 0 20px ${annotationBounds[0]?.annotation.color || '#f20d63'}50;
        }
        
        .annotation-label {
          user-select: none;
        }
        
        /* Responsive adjustments for smaller canvas sizes */
        @media (max-width: 768px) {
          .annotation-boundary {
            border-width: 1px !important;
          }
          
          .annotation-label {
            font-size: 10px !important;
            padding: 2px 6px !important;
          }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .annotation-boundary {
            border-width: 3px !important;
            background-color: transparent !important;
          }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .annotation-boundary {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};