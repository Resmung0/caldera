import React, { useMemo } from 'react';
import { PipelinePatternType } from '../../shared/types';
import { PIPELINE_PATTERN_SUBTYPES } from '../../shared/annotationConstants';
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
  Fingerprint
} from 'lucide-react';

interface PatternSelectorProps {
  selectedPatternType?: PipelinePatternType;
  selectedPatternSubtype?: string;
  onPatternSelect: (patternType: PipelinePatternType, patternSubtype: string) => void;
  disabled?: boolean;
  activeCategory?: string;
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

/**
 * PatternSelector component for choosing pipeline pattern types and subtypes
 * Rendered as a vertical list next to the cursor
 */
export const PatternSelector: React.FC<PatternSelectorProps> = ({
  selectedPatternType,
  selectedPatternSubtype,
  onPatternSelect,
  disabled = false,
  activeCategory
}) => {
  const patternCategories = useMemo(() => [
    {
      type: PipelinePatternType.CICD,
      label: 'CI/CD',
    },
    {
      type: PipelinePatternType.DATA_PROCESSING,
      label: 'Data Processing',
    },
    {
      type: PipelinePatternType.AI_AGENT,
      label: 'AI Agent',
    },
    {
      type: PipelinePatternType.RPA,
      label: 'RPA',
    }
  ].filter(category => !activeCategory || category.type === activeCategory), [activeCategory]);

  return (
    <div className={`pattern-list-container ${disabled ? 'disabled' : ''}`}>
      <div className="list-header">
        <Fingerprint size={16} />
        <span style={{ fontSize: '11px', marginLeft: '8px' }}>Choose your pipeline pattern to highlight</span>
      </div>
      {patternCategories.map((category) => {
        const subtypes = PIPELINE_PATTERN_SUBTYPES[category.type] || [];

        return (
          <div key={category.type} className="pattern-group">
            {!activeCategory && <div className="group-label">{category.label}</div>}
            <div className="subtypes-vertical-list">
              {subtypes.map((subtype) => {
                const Icon = SUBTYPE_ICONS[subtype.key] || Link;
                const isSelected = selectedPatternType === category.type &&
                  selectedPatternSubtype === subtype.key;

                return (
                  <div
                    key={subtype.key}
                    className={`pattern-option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => !disabled && onPatternSelect(category.type, subtype.key)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                        e.preventDefault();
                        onPatternSelect(category.type, subtype.key);
                      }
                    }}
                    tabIndex={disabled ? -1 : 0}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="pattern-option-content">
                      <Icon size={16} className="pattern-icon" />
                      <span className="pattern-name">{subtype.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <style>{`
        .pattern-list-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 120px;
          background: rgba(24, 27, 40, 0.95);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.2);
          user-select: none;
        }

        .list-header {
          font-size: 9px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.4);
          padding: 4px 6px;
          margin-bottom: 2px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pattern-list-container.disabled {
          opacity: 0.6;
          pointer-events: none;
        }

        .pattern-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .group-label {
          font-size: 10px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 4px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 4px;
        }

        .subtypes-vertical-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .pattern-option-item {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid transparent;
        }

        .pattern-option-item:hover {
          background: rgba(242, 13, 99, 0.1);
          color: #f20d63;
          transform: translateX(4px);
          border-color: rgba(242, 13, 99, 0.2);
        }

        .pattern-option-item.selected {
          background: rgba(242, 13, 99, 0.2);
          color: #f20d63;
          border-color: rgba(242, 13, 99, 0.3);
        }

        .pattern-option-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pattern-icon {
          flex-shrink: 0;
          opacity: 0.8;
        }

        .pattern-option-item:hover .pattern-icon {
          opacity: 1;
        }

        .pattern-name {
          font-size: 13px;
          font-weight: 500;
        }

        .pattern-list-container::-webkit-scrollbar {
          width: 4px;
        }

        .pattern-list-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .pattern-list-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};