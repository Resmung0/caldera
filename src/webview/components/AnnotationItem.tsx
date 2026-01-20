import React, { useState, useMemo } from 'react';
import { PipelineAnnotation, AnnotationBounds, PipelinePatternType } from '../../shared/types';
import {
  FlaskConical,
  Hammer,
  Layers,
  BrainCircuit,
  BrainCog,
  Bug,
  Link,
  Network,
  Split,
  VectorSquare,
  ChartSpline,
  Globe,
  Settings2,
  Trash2,
  HelpCircle,
  Type
} from 'lucide-react';

const ANNOTATION_HELP_TEXT = `Drag on the canvas to create a selection area and group nodes.
Shortcuts: Ctrl+A (select all) • Del (clear) • Esc (exit annotation mode).`;

interface AnnotationItemProps {
  annotation: PipelineAnnotation;
  bounds: AnnotationBounds;
  index: number;
  isDarkTheme?: boolean;
  showLabels?: boolean;
  animationEnabled?: boolean;
  onDeleteAnnotation?: (id: string) => void;
  onEditAnnotation?: (id: string, position: { x: number, y: number }) => void;
}

const SUBTYPE_ICONS: Record<string, React.ElementType> = {
  // CI/CD
  testing: FlaskConical,
  build: Hammer,
  // Data Processing
  etl: Layers,
  modelTraining: BrainCircuit,
  modelInference: BrainCog,
  webscraping: Bug,
  // AI Agent
  promptChaining: Link,
  routing: Network,
  parallelization: Split,
  orchestratorWorkers: VectorSquare,
  evaluatorOptimizer: ChartSpline,
  // RPA
  browseAutomation: Globe,
};

const getPatternIcon = (type: PipelinePatternType, subtype?: string) => {
  if (subtype && SUBTYPE_ICONS[subtype]) {
    return SUBTYPE_ICONS[subtype];
  }
  return Type;
};

const AnnotationItem: React.FC<AnnotationItemProps> = ({
  annotation,
  bounds,
  index,
  isDarkTheme = true,
  showLabels = true,
  animationEnabled = true,
  onDeleteAnnotation,
  onEditAnnotation
}) => {
  const [showHelp, setShowHelp] = useState(false);

  const getAnnotationZIndex = (idx: number): number => {
    const baseZIndex = 10;
    return baseZIndex + idx;
  };

  const zIndex = getAnnotationZIndex(index);
  const Icon = useMemo(() => getPatternIcon(annotation.patternType, annotation.patternSubtype), [annotation.patternType, annotation.patternSubtype]);

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
        {/* Help Button */}
        <div
          style={{ position: 'relative' }} // For positioning the tooltip
          onMouseEnter={() => setShowHelp(true)}
          onMouseLeave={() => setShowHelp(false)}
        >
          <button
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: 'rgba(30, 32, 49, 0.95)',
              border: `1px solid ${isDarkTheme ? '#ccc' : '#333'}`,
              color: isDarkTheme ? '#ccc' : '#333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'help',
              padding: 0,
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
            title="Annotation Help"
          >
            <HelpCircle size={12} />
          </button>
          {showHelp && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                backgroundColor: 'rgba(30, 32, 49, 0.98)',
                border: `1px solid ${isDarkTheme ? '#444' : '#bbb'}`,
                borderRadius: '6px',
                padding: '10px',
                width: '250px',
                fontSize: '11px',
                color: isDarkTheme ? '#eee' : '#333',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                whiteSpace: 'pre-wrap', // Preserve line breaks
                zIndex: zIndex + 4
              }}
            >
              {ANNOTATION_HELP_TEXT}
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditAnnotation?.(annotation.id, { x: e.clientX, y: e.clientY });
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

export default AnnotationItem;