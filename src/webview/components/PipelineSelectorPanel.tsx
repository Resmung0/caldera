import React, { useState, useRef, useEffect } from 'react';
import { Panel } from 'reactflow';
import { GitBranch } from 'lucide-react';

interface PipelineSelectorPanelProps {
    availablePipelines: string[];
    currentPipeline: string;
    onPipelineSelect: (filePath: string) => void;
}

export const PipelineSelectorPanel: React.FC<PipelineSelectorPanelProps> = ({
    availablePipelines,
    currentPipeline,
    onPipelineSelect
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    if (!availablePipelines || availablePipelines.length <= 1) {
        return null;
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const currentFileName = currentPipeline ? currentPipeline.split('/').pop() : '';

    return (
        <Panel position="bottom-right" style={{ marginBottom: '90px', marginRight: '10px' }}>
            <div className="pipeline-selector" ref={dropdownRef}>
                <GitBranch size={14} />
                <div className="custom-select" onClick={() => setIsOpen(!isOpen)}>
                    <span className="selected-value">{currentFileName}</span>
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                {isOpen && (
                    <div className="dropdown-options">
                        {availablePipelines.map((p: string) => (
                            <div
                                key={p}
                                className={`dropdown-option ${p === currentPipeline ? 'selected' : ''}`}
                                onClick={() => {
                                    onPipelineSelect(p);
                                    setIsOpen(false);
                                }}
                            >
                                {p.split('/').pop()}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <style>{`
        .pipeline-selector {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--color-bg-primary);
          border-radius: 8px;
          border: 1px solid var(--color-border);
          box-shadow: 0 2px 8px var(--color-shadow);
          color: var(--color-text-primary);
          min-width: 160px;
          position: relative;
        }
        .custom-select {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex: 1;
          cursor: pointer;
          gap: 8px;
        }
        .selected-value {
          font-size: 13px;
          font-weight: 400;
          color: var(--color-text-primary);
          flex: 1;
          text-align: left;
        }
        .dropdown-arrow {
          color: var(--color-text-primary);
          opacity: 0.6;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .dropdown-arrow.open {
          transform: rotate(180deg);
          opacity: 1;
        }
        .dropdown-options {
          position: absolute;
          bottom: 100%;
          left: 0;
          right: 0;
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          box-shadow: 0 4px 12px var(--color-shadow);
          margin-bottom: 4px;
          z-index: 1000;
          max-height: 200px;
          overflow-y: auto;
        }
        .dropdown-option {
          padding: 8px 12px;
          font-size: 13px;
          color: var(--color-text-primary);
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .dropdown-option:hover {
          background: var(--color-bg-hover);
        }
        .dropdown-option.selected {
          background: #f20d63;
          color: white;
        }
        .dropdown-option:first-child {
          border-top-left-radius: 7px;
          border-top-right-radius: 7px;
        }
        .dropdown-option:last-child {
          border-bottom-left-radius: 7px;
          border-bottom-right-radius: 7px;
        }
        .pipeline-selector:hover {
          border-color: #f20d63;
          box-shadow: 0 0 12px rgba(242, 13, 99, 0.25);
        }
        .pipeline-selector:hover .dropdown-arrow {
          opacity: 1;
        }
      `}</style>
        </Panel>
    );
};
