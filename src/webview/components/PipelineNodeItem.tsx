import { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Clock,
  CircleDashed,
  Terminal,
  GitBranch,
  ChevronDown,
  FileCode,
  List,
  Folder,
  Sparkles
} from 'lucide-react';
import { SiGithub, SiGitlab, SiDvc } from 'react-icons/si';
import { FiDatabase } from 'react-icons/fi';
import { LuImage, LuTable2, LuVideo, LuMusic4 } from 'react-icons/lu';
import { NodeDropdown } from './NodeDropdown';

/**
 * Centralized configuration for pipeline node status rendering.
 * Maps each status to its visual properties (icon, color, animation, styling).
 * 
 * @property icon - The Lucide icon component to display for this status
 * @property iconColor - The hex color code for the icon
 * @property animationVariant - The animation variant key from nodeVariants
 * @property className - CSS class name to apply for this status
 * @property showSweep - Whether to display the sweep overlay animation
 */
const STATUS_CONFIG = {
  idle: {
    icon: CircleDashed,
    iconColor: '#a0aec0',
    animationVariant: 'idle' as const,
    className: '',
    showSweep: false,
  },
  processing: {
    icon: Clock,
    iconColor: '#f20d63',
    animationVariant: 'idle' as const,
    className: 'processing',
    showSweep: true,
  },
  running: {
    icon: Clock,
    iconColor: '#f20d63',
    animationVariant: 'idle' as const,
    className: 'processing',
    showSweep: true,
  },
  success: {
    icon: CheckCircle,
    iconColor: '#4ade80',
    animationVariant: 'success' as const,
    className: 'success',
    showSweep: false,
  },
  failed: {
    icon: XCircle,
    iconColor: '#891fff',
    animationVariant: 'failed' as const,
    className: 'failed',
    showSweep: false,
  },
} as const;

// Animation variants for node status
const nodeVariants = {
  idle: {},
  processing: {},
  failed: {
    x: [-2, 2, -2, 2, -1, 1, 0],
    rotate: [-1, 1, -1, 1, -0.5, 0.5, 0],
    transition: {
      duration: 0.4,
      repeat: Infinity,
      repeatDelay: 0.1,
    },
  },
  success: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 0.5,
    },
  },
};

// Sweep overlay animation
const sweepVariants = {
  initial: { backgroundPosition: '-200% 0' },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      duration: 1.2,
      repeat: Infinity,
    },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// Sparkle animation variants
// Ripple animation variants for artifact materialization
const rippleVariants = {
  initial: {
    opacity: 0.8,
    scale: 1,
    borderWidth: "2px"
  },
  animate: {
    opacity: 0,
    scale: 1.5,
    borderWidth: "0px",
    transition: {
      duration: 1.5,
      ease: "easeOut" as const
    }
  }
};

export const PipelineNodeItem = ({ data, id }: NodeProps) => {
  const { layoutDirection = 'TB', isSelectionMode = false, isSelected = false, type } = data;
  const [isDepsExpanded, setIsDepsExpanded] = useState(false);
  const [isParamsExpanded, setIsParamsExpanded] = useState(false);

  const targetPosition = layoutDirection === 'LR' ? Position.Left : Position.Top;
  const sourcePosition = layoutDirection === 'LR' ? Position.Right : Position.Bottom;

  const isArtifact = type === 'artifact';

  // Use STATUS_CONFIG for all status-related rendering
  const status = (data.status || 'idle') as keyof typeof STATUS_CONFIG;
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  const getDataTypeIcon = (dataType: string) => {
    switch (dataType) {
      case 'image': return <LuImage size={12} />;
      case 'table': return <LuTable2 size={12} />;
      case 'video': return <LuVideo size={12} />;
      case 'audio': return <LuMusic4 size={12} />;
      case 'folder': return <Folder size={12} />;
      default: return null;
    }
  };

  if (isArtifact) {
    return (
      <motion.div
        className={`pipeline-node-item artifact ${isSelectionMode ? 'selection-mode' : ''} ${isSelected ? 'selected' : ''} ${config.className}`}
        variants={nodeVariants}
        animate={config.animationVariant}
      >
        <Handle type="target" position={targetPosition} className="handle" />
        {status === 'success' && (
          <motion.div
            className="materialize-ripple"
            variants={rippleVariants}
            initial="initial"
            animate="animate"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: '18px',
              border: '2px solid #f20d63',
              boxShadow: '0 0 10px rgba(242, 13, 99, 0.5)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
        )}

        <div className="artifact-header">
          <div className="artifact-header-icon">
            <FiDatabase size={12} />
          </div>
          <div className="artifact-name" title={data.label}>{data.label}</div>
        </div>

        <div className="artifact-body">
          {status === 'success' && (
            <div className="artifact-badge success">
              <Sparkles size={8} />
              <span>Materialized</span>
            </div>
          )}
          {data.dataType && data.dataType !== 'other' && (
            <div className="artifact-badge">
              {getDataTypeIcon(data.dataType)}
              <span>{data.dataType}</span>
            </div>
          )}
          {data.dataType === 'folder' && data.contents && (
            <div className="folder-preview">
              {data.contents.slice(0, 1).map((item: string) => (
                <div key={item} className="folder-item">• {item}</div>
              ))}
            </div>
          )}
        </div>

        <Handle type="source" position={sourcePosition} className="handle" />

        <style>{`
                    .pipeline-node-item.artifact {
                        width: 180px;
                        height: 36px;
                        border-radius: 18px;
                        padding: 3px 14px;
                        background: var(--color-bg-primary);
                        border: 1px solid var(--color-border);
                        display: flex;
                        flex-direction: column;
                        transition: all 0.3s ease;
                        transition: all 0.3s ease;
                        overflow: visible;
                        position: relative;
                    }

                    .artifact-header {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        padding-bottom: 2px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                        margin-bottom: 2px;
                        height: 15px;
                    }

                    .artifact-header-icon {
                        color: var(--color-text-primary);
                        display: flex;
                        align-items: center;
                        opacity: 0.7;
                    }

                    .artifact-name {
                        font-size: 10px;
                        font-weight: 600;
                        color: var(--color-text-primary);
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        flex: 1;
                        line-height: 1;
                    }

                    .artifact-body {
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        gap: 4px;
                        height: 12px;
                    }

                    .artifact-badge {
                        display: inline-flex;
                        align-items: center;
                        gap: 2px;
                        background: rgba(255, 255, 255, 0.03);
                        border: 1px solid rgba(255, 255, 255, 0.05);
                        border-radius: 6px;
                        padding: 0px 4px;
                        font-size: 7px;
                        color: #94a3b8;
                        text-transform: capitalize;
                        width: fit-content;
                        line-height: 1;
                    }

                    .artifact-badge.success {
                        color: #801fef;
                        border-color: rgba(128, 31, 239, 0.2);
                        background: rgba(128, 31, 239, 0.1);
                    }

                    .folder-preview {
                        font-size: 7px;
                        color: #94a3b8;
                        display: flex;
                        align-items: center;
                        line-height: 1;
                    }

                    .folder-item {
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        max-width: 60px;
                    }

                    .pipeline-node-item.artifact.selected::after {
                        border-radius: 18px;
                    }
                `}</style>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`pipeline-node-item ${isSelectionMode ? 'selection-mode' : ''} ${isSelected ? 'selected' : ''} ${config.className}`}
      variants={nodeVariants}
      animate={config.animationVariant}
    >
      <Handle type="target" position={targetPosition} className="handle" />

      {/* Sweep overlay for processing */}
      <AnimatePresence>
        {config.showSweep && (
          <motion.div
            className="sweep-overlay"
            variants={sweepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          />
        )}
      </AnimatePresence>

      <div className="node-header">
        <div className="node-icon">
          <Terminal size={16} color="#a0aec0" />
        </div>
        <div className="node-title" title={data.label}>{data.label}</div>
        {/* Remove the chevron toggle from header since we'll use a badge below */}
      </div>

      <div className="node-body">
        {data.framework && (
          <div className="node-meta">
            {(() => {
              const framework = data.framework.toLowerCase();
              if (framework.includes('github')) {
                return <SiGithub size={12} style={{ marginRight: 4 }} />;
              }
              if (framework.includes('gitlab')) {
                return <SiGitlab size={12} style={{ marginRight: 4 }} />;
              }
              if (framework.includes('dvc')) {
                return <SiDvc size={12} style={{ marginRight: 4 }} />;
              }
              return <GitBranch size={12} style={{ marginRight: 4 }} />;
            })()}
            <span>{data.framework}</span>
          </div>
        )}

        {((data.params && Object.keys(data.params).length > 0) || (data.codeDeps && data.codeDeps.length > 0)) && (
          <div className="node-badges-row">
            {data.params && Object.keys(data.params).length > 0 && (
              <NodeDropdown
                icon={List}
                label="Params"
                isExpanded={isParamsExpanded}
                onToggle={(e) => { e.stopPropagation(); setIsParamsExpanded(!isParamsExpanded); }}
                items={data.params}
                variant="params"
              />
            )}
            {data.codeDeps && data.codeDeps.length > 0 && (
              <NodeDropdown
                icon={FileCode}
                label="Deps"
                isExpanded={isDepsExpanded}
                onToggle={(e) => { e.stopPropagation(); setIsDepsExpanded(!isDepsExpanded); }}
                items={data.codeDeps}
                variant="deps"
              />
            )}
          </div>
        )}

        <div className="node-status">
          <StatusIcon size={14} color={config.iconColor} />
          <span>{data.status || 'Idle'}</span>
        </div>
      </div>

      <Handle type="source" position={sourcePosition} className="handle" />

      <style>{`
        .pipeline-node-item {
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 12px;
          width: 220px;
          box-shadow: 0 4px 6px var(--color-shadow);
          transition: all 0.3s ease;
          position: relative;
        }
        
        .pipeline-node-item:hover {
          border-color: #f20d63;
          box-shadow: 0 0 15px rgba(242, 13, 99, 0.3);
          transform: translateY(-2px);
        }
        
        .pipeline-node-item.selection-mode {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .pipeline-node-item.selection-mode:hover {
          border-color: #f20d63;
          box-shadow: 0 0 20px rgba(242, 13, 99, 0.4);
          transform: translateY(-1px);
        }
        
        .pipeline-node-item.selected {
          border-color: #f20d63 !important;
          box-shadow: 0 0 20px rgba(242, 13, 99, 0.6) !important;
          background: rgba(242, 13, 99, 0.05);
          transform: translateY(-2px);
        }
        
        .pipeline-node-item.selected::after {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          border: 2px solid #f20d63;
          border-radius: 14px;
          pointer-events: none;
          animation: selectedPulse 2s infinite;
        }

        .pipeline-node-item.artifact.selected::after {
            border-radius: 32px;
        }
        
        @keyframes selectedPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .node-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 8px;
        }
        .node-title {
          flex: 1;
          font-weight: 600;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .node-action {
          cursor: pointer;
          opacity: 0.6;
          display: flex;
          align-items: center;
          transition: opacity 0.2s;
        }
        .node-action:hover {
          opacity: 1;
        }
        .node-badges-row {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          gap: 6px;
          margin-top: 4px;
        }

        .node-body {
          font-size: 11px;
          color: #a0aec0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .node-meta {
          display: flex;
          align-items: center;
        }
        .handle {
          background: #f20d63 !important;
          width: 8px !important;
          height: 8px !important;
          border: 2px solid var(--color-bg-primary) !important;
        }

        .node-status {
          display: flex;
          align-items: center;
          gap: 6px;
        }
      `}</style>
    </motion.div>
  );
};
