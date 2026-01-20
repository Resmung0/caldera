import React, { useState, useRef, useEffect } from 'react';
import { PipelinePatternType } from '../../shared/types';
import { PIPELINE_PATTERN_SUBTYPES, DEFAULT_ANNOTATION_COLOR_SCHEME } from '../../shared/annotationConstants';
import { 
  Workflow, 
  Database, 
  Sparkle, 
  Bot, 
  ChevronDown, 
  ChevronUp,
  Check 
} from 'lucide-react';

interface PatternSelectorProps {
  selectedPatternType?: PipelinePatternType;
  selectedPatternSubtype?: string;
  onPatternSelect: (patternType: PipelinePatternType, patternSubtype: string) => void;
  disabled?: boolean;
}

/**
 * PatternSelector component for choosing pipeline pattern types and subtypes
 * Provides a dropdown interface with pattern categories and their subtypes
 */
export const PatternSelector: React.FC<PatternSelectorProps> = ({
  selectedPatternType,
  selectedPatternSubtype,
  onPatternSelect,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<PipelinePatternType | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calcular posição do dropdown baseado no espaço disponível
  useEffect(() => {
    if (isOpen && containerRef.current && dropdownRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = dropdownRef.current.scrollHeight;
      const viewportHeight = window.innerHeight;
      
      // Verificar se há espaço suficiente abaixo
      const spaceBelow = viewportHeight - containerRect.bottom;
      const spaceAbove = containerRect.top;
      
      // Posicionar acima se não houver espaço suficiente abaixo
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [isOpen]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setExpandedCategory(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const patternCategories = [
    { 
      type: PipelinePatternType.CICD, 
      icon: Workflow, 
      label: 'CI/CD',
      description: 'Continuous Integration and Deployment patterns'
    },
    { 
      type: PipelinePatternType.DATA_PROCESSING, 
      icon: Database, 
      label: 'Data Processing',
      description: 'Data transformation and processing patterns'
    },
    { 
      type: PipelinePatternType.AI_AGENT, 
      icon: Sparkle, 
      label: 'AI Agent',
      description: 'AI agent workflow and orchestration patterns'
    },
    { 
      type: PipelinePatternType.RPA, 
      icon: Bot, 
      label: 'RPA',
      description: 'Robotic Process Automation patterns'
    }
  ];

  const handleCategoryClick = (categoryType: PipelinePatternType) => {
    if (expandedCategory === categoryType) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryType);
    }
  };

  const handleSubtypeSelect = (patternType: PipelinePatternType, subtypeKey: string) => {
    onPatternSelect(patternType, subtypeKey);
    setIsOpen(false);
    setExpandedCategory(null);
  };

  const getSelectedLabel = () => {
    if (!selectedPatternType || !selectedPatternSubtype) {
      return "Select Pattern";
    }
    
    const category = patternCategories.find(cat => cat.type === selectedPatternType);
    const subtypes = PIPELINE_PATTERN_SUBTYPES[selectedPatternType] || [];
    const subtype = subtypes.find(st => st.key === selectedPatternSubtype);
    
    return `${category?.label}: ${subtype?.label}`;
  };

  const getPatternColor = (patternType: PipelinePatternType, subtypeKey: string) => {
    const colorScheme = DEFAULT_ANNOTATION_COLOR_SCHEME[patternType];
    return (colorScheme as any)[subtypeKey] || '#6B7280';
  };

  return (
    <div className="pattern-selector-container" ref={containerRef}>
      <div 
        className={`pattern-selector ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label="Select pipeline pattern"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="selected-pattern">{getSelectedLabel()}</span>
        {dropdownPosition === 'bottom' ? (
          <ChevronDown size={16} className={`chevron ${isOpen ? 'rotated' : ''}`} />
        ) : (
          <ChevronUp size={16} className={`chevron ${isOpen ? 'rotated' : ''}`} />
        )}
      </div>

      {isOpen && !disabled && (
        <div 
          ref={dropdownRef}
          className={`pattern-dropdown ${dropdownPosition}`}
          role="listbox"
        >
          {patternCategories.map((category) => {
            const Icon = category.icon;
            const isExpanded = expandedCategory === category.type;
            const subtypes = PIPELINE_PATTERN_SUBTYPES[category.type] || [];

            return (
              <div key={category.type} className="pattern-category">
                <div 
                  className={`category-header ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => handleCategoryClick(category.type)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCategoryClick(category.type);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-expanded={isExpanded}
                >
                  <div className="category-info">
                    <Icon size={16} />
                    <div>
                      <div className="category-label">{category.label}</div>
                      <div className="category-description">{category.description}</div>
                    </div>
                  </div>
                  <ChevronDown 
                    size={14} 
                    className={`category-chevron ${isExpanded ? 'rotated' : ''}`} 
                  />
                </div>

                {isExpanded && (
                  <div className="subtypes-list">
                    {subtypes.map((subtype) => {
                      const isSelected = selectedPatternType === category.type && 
                                       selectedPatternSubtype === subtype.key;
                      const color = getPatternColor(category.type, subtype.key);

                      return (
                        <div
                          key={subtype.key}
                          className={`subtype-option ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSubtypeSelect(category.type, subtype.key)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSubtypeSelect(category.type, subtype.key);
                            }
                          }}
                          tabIndex={0}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="subtype-info">
                            <div 
                              className="color-indicator" 
                              style={{ backgroundColor: color }}
                            />
                            <div>
                              <div className="subtype-label">{subtype.label}</div>
                              <div className="subtype-description">{subtype.description}</div>
                            </div>
                          </div>
                          {isSelected && <Check size={16} className="check-icon" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .pattern-selector-container {
          position: relative;
          min-width: 200px;
        }

        .pattern-selector {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 13px;
        }

        .pattern-selector:hover:not(.disabled) {
          border-color: #f20d63;
          box-shadow: 0 0 8px rgba(242, 13, 99, 0.2);
        }

        .pattern-selector:focus-visible {
          outline: 2px solid #f20d63;
          outline-offset: 2px;
        }

        .pattern-selector.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .selected-pattern {
          color: var(--color-text-primary);
          font-weight: 500;
        }

        .chevron {
          color: var(--color-text-secondary);
          transition: transform 0.2s ease;
        }

        .chevron.rotated {
          transform: rotate(180deg);
        }

        .pattern-dropdown {
          position: absolute;
          left: 0;
          right: 0;
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: 6px;
          box-shadow: 0 4px 12px var(--color-shadow);
          z-index: 1000;
          max-height: 300px;
          overflow-y: auto;
        }

        .pattern-dropdown.bottom {
          top: 100%;
          margin-top: 4px;
        }

        .pattern-dropdown.top {
          bottom: 100%;
          margin-bottom: 4px;
        }

        .pattern-category {
          border-bottom: 1px solid var(--color-border);
        }

        .pattern-category:last-child {
          border-bottom: none;
        }

        .category-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .category-header:hover {
          background: var(--color-bg-hover);
        }

        .category-header:focus-visible {
          outline: 2px solid #f20d63;
          outline-offset: -2px;
        }

        .category-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .category-label {
          font-weight: 600;
          color: var(--color-text-primary);
          font-size: 13px;
        }

        .category-description {
          font-size: 11px;
          color: var(--color-text-secondary);
          margin-top: 2px;
        }

        .category-chevron {
          color: var(--color-text-secondary);
          transition: transform 0.2s ease;
        }

        .category-chevron.rotated {
          transform: rotate(180deg);
        }

        .subtypes-list {
          background: var(--color-bg-secondary);
          border-top: 1px solid var(--color-border);
        }

        .subtype-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .subtype-option:hover {
          background: var(--color-bg-hover);
        }

        .subtype-option:focus-visible {
          outline: 2px solid #f20d63;
          outline-offset: -2px;
        }

        .subtype-option.selected {
          background: rgba(242, 13, 99, 0.1);
          color: #f20d63;
        }

        .subtype-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .color-indicator {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .subtype-label {
          font-weight: 500;
          color: var(--color-text-primary);
          font-size: 12px;
        }

        .subtype-description {
          font-size: 11px;
          color: var(--color-text-secondary);
          margin-top: 1px;
        }

        .check-icon {
          color: #f20d63;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};