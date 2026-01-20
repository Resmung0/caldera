import React, { useMemo } from 'react';
import { useReactFlow, useViewport } from 'reactflow';
import { PipelineAnnotation, AnnotationBounds } from '../../shared/types';
import AnnotationItem from './AnnotationItem';

interface AnnotationLayerProps {
  annotations: PipelineAnnotation[];
  isDarkTheme?: boolean;
  showLabels?: boolean;
  animationEnabled?: boolean;
  onDeleteAnnotation?: (id: string) => void;
  onEditAnnotation?: (id: string, position: { x: number, y: number }) => void;
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
        bounds && (
          <AnnotationItem
            key={annotation.id}
            annotation={annotation}
            bounds={bounds}
            index={index}
            isDarkTheme={isDarkTheme}
            showLabels={showLabels}
            animationEnabled={animationEnabled}
            onDeleteAnnotation={onDeleteAnnotation}
            onEditAnnotation={onEditAnnotation}
          />
        )
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
          box-shadow: 0 0 20px ${isDarkTheme ? '#f20d63' : '#f20d63'}50;
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