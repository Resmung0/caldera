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
  ChevronRight,
  FileCode,
  List,
  Folder
} from 'lucide-react';
import { SiGithub, SiGitlab, SiDvc } from 'react-icons/si';
import { FiDatabase } from 'react-icons/fi';
import { LuImage, LuTable2, LuVideo, LuMusic4 } from 'react-icons/lu';

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

export const PipelineNodeItem = ({ data, id }: NodeProps) => {
  const { layoutDirection = 'TB', isSelectionMode = false, isSelected = false, type } = data;
  const [isDepsExpanded, setIsDepsExpanded] = useState(false);
  const [isParamsExpanded, setIsParamsExpanded] = useState(false);

  const targetPosition = layoutDirection === 'LR' ? Position.Left : Position.Top;
  const sourcePosition = layoutDirection === 'LR' ? Position.Right : Position.Bottom;

  const isArtifact = type === 'artifact';

  const getStatusIcon = () => {
    switch (data.status) {
      case 'success': return <CheckCircle size={14} color="#4ade80" />;
      case 'failed': return <XCircle size={14} color="#891fff" />;
      case 'running':
      case 'processing': return <Clock size={14} color="#f20d63" />;
      default: return <CircleDashed size={14} color="#a0aec0" />;
    }
  };

  const isProcessing = data.status === 'running' || data.status === 'processing';
  const isFailed = data.status === 'failed';
  const isSuccess = data.status === 'success';
  const animationStatus = isFailed ? 'failed' : isSuccess ? 'success' : 'idle';

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
        className={`pipeline-node-item artifact ${isSelectionMode ? 'selection-mode' : ''} ${isSelected ? 'selected' : ''} ${isFailed ? 'failed' : ''} ${isSuccess ? 'success' : ''}`}
        variants={nodeVariants}
        animate={animationStatus}
      >
        <Handle type="target" position={targetPosition} className="handle" />



        <div className="artifact-header">
          <div className="artifact-header-icon">
            <FiDatabase size={12} />
          </div>
          <div className="artifact-name" title={data.label}>{data.label}</div>
        </div>

        <div className="artifact-body">
          {isSuccess && (
            <div className="artifact-badge success">
              <CheckCircle size={8} />
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
                        overflow: hidden;
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
                        color: #4ade80;
                        border-color: rgba(74, 222, 128, 0.2);
                        background: rgba(74, 222, 128, 0.05);
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
      className={`pipeline-node-item ${isSelectionMode ? 'selection-mode' : ''} ${isSelected ? 'selected' : ''} ${isProcessing ? 'processing' : ''} ${isFailed ? 'failed' : ''} ${isSuccess ? 'success' : ''}`}
      variants={nodeVariants}
      animate={animationStatus}
    >
      <Handle type="target" position={targetPosition} className="handle" />

      {/* Sweep overlay for processing */}
      <AnimatePresence>
        {isProcessing && (
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
              <div className="params-badge" onClick={(e) => { e.stopPropagation(); setIsParamsExpanded(!isParamsExpanded); }}>
                <List size={10} />
                <span>Params</span>
                <ChevronDown size={10} style={{ transform: isParamsExpanded ? 'rotate(180deg)' : 'none' }} />
              </div>
            )}
            {data.codeDeps && data.codeDeps.length > 0 && (
              <div className="deps-badge" onClick={(e) => { e.stopPropagation(); setIsDepsExpanded(!isDepsExpanded); }}>
                <FileCode size={10} />
                <span>Deps</span>
                <ChevronDown size={10} style={{ transform: isDepsExpanded ? 'rotate(180deg)' : 'none' }} />
              </div>
            )}
          </div>
        )}

        {isParamsExpanded && data.params && Object.keys(data.params).length > 0 && (
          <div className="params-dropdown">
            {Object.entries(data.params).map(([key, val]: [string, any]) => (
              <div key={key} className="param-item">
                <span className="param-key">{key}:</span>
                <span className="param-val">{typeof val === 'object' ? '{...}' : String(val)}</span>
              </div>
            ))}
          </div>
        )}

        {isDepsExpanded && data.codeDeps && data.codeDeps.length > 0 && (
          <div className="params-dropdown">
            {data.codeDeps.map((dep: any, index: number) => (
              <div key={index} className="param-item">
                <span className="param-key">{dep.path.split('/').pop()}</span>
                <span className="param-val" title={dep.path}>{dep.path}</span>
              </div>
            ))}
          </div>
        )}

        <div className="node-status">
          {getStatusIcon()}
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
          gap: 6px;
          margin-top: 4px;
        }
        .params-badge, .deps-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(242, 13, 99, 0.1);
          border: 1px solid rgba(242, 13, 99, 0.3);
          border-radius: 10px;
          padding: 2px 8px;
          font-size: 10px;
          color: #f20d63;
          cursor: pointer;
          width: fit-content;
        }
        .deps-badge {
          background: rgba(128, 31, 239, 0.1);
          border-color: rgba(128, 31, 239, 0.3);
          color: #891fff;
        }
        .params-dropdown {
          margin-top: 4px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          max-width: 100%;
          overflow: hidden;
        }
        .param-item {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          gap: 8px;
          overflow: hidden;
        }
        .param-key {
          color: #a0aec0;
          white-space: nowrap;
        }
        .param-val {
          color: #fff;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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
