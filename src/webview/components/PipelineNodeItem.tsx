import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, GitBranch, List, FileCode, ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, AlertCircle, Database } from 'lucide-react';
import { SiGithub, SiGitlab, SiDvc } from 'react-icons/si';

type NodeDropdownCommonProps = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  isExpanded: boolean;
  onToggle: (e: React.MouseEvent) => void;
};

type NodeDropdownParamsProps = NodeDropdownCommonProps & {
  variant: 'params';
  items: Record<string, unknown>;
};

type NodeDropdownDepsItem = {
  path: string;
  snippet?: string;
};

type NodeDropdownDepsProps = NodeDropdownCommonProps & {
  variant: 'deps';
  items: NodeDropdownDepsItem[];
};

type NodeDropdownProps = NodeDropdownParamsProps | NodeDropdownDepsProps;

const NodeDropdown: React.FC<NodeDropdownProps> = (props) => {
  const { icon: Icon, label, items, isExpanded, onToggle, variant } = props;
  return (
    <div className={`node-dropdown ${variant}`}>
      <div className="dropdown-trigger" onClick={onToggle}>
        <Icon size={12} className="dropdown-icon" />
        <span className="dropdown-label">{label}</span>
        {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="dropdown-content"
          >
            {variant === 'params' ? (
              Object.entries(items).map(([key, value]) => (
                <div key={key} className="dropdown-item">
                  <span className="item-key">{key}:</span>
                  <span className="item-value">{JSON.stringify(value)}</span>
                </div>
              ))
            ) : (
              (items as NodeDropdownDepsItem[]).map((dep, idx) => (
                <div key={idx} className="dropdown-item dep-item">
                  <div className="dep-path">{dep.path}</div>
                  {dep.snippet && <pre className="dep-snippet"><code>{dep.snippet}</code></pre>}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const PipelineNodeItem: React.FC<NodeProps> = ({ type, data, selected, targetPosition = Position.Top, sourcePosition = Position.Bottom }) => {
  const [isParamsExpanded, setIsParamsExpanded] = useState(false);
  const [isDepsExpanded, setIsDepsExpanded] = useState(false);

  const isSelected = selected;
  const isSelectionMode = data.isSelectionMode;

  const nodeVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    hover: { scale: 1.02, transition: { duration: 0.2 } }
  };

  const sweepVariants = {
    initial: { left: '-100%' },
    animate: { left: '100%', transition: { duration: 1.5, repeat: Infinity, ease: "linear" } },
    exit: { opacity: 0 }
  };

  const getStatusConfig = (status?: string) => {
    switch (status) {
      case 'running':
      case 'processing':
        return {
          icon: Clock,
          color: '#3b82f6',
          animationVariant: { scale: [1, 1.02, 1], transition: { repeat: Infinity, duration: 2 } },
          showSweep: true,
          className: status,
          iconColor: '#3b82f6'
        };
      case 'success':
        return { icon: CheckCircle2, color: '#10b981', iconColor: '#10b981', className: 'success' };
      case 'failed':
        return { icon: AlertCircle, color: '#ef4444', iconColor: '#ef4444', className: 'failed' };
      default:
        return { icon: Circle, color: '#94a3b8', iconColor: '#94a3b8', className: 'idle' };
    }
  };

  const config = getStatusConfig(data.status);
  const StatusIcon = config.icon;

  if (type === 'artifact') {
    return (
      <motion.div
        className={`pipeline-node-item artifact ${isSelectionMode ? 'selection-mode' : ''} ${isSelected ? 'selected' : ''}`}
        variants={nodeVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
      >
        <Handle type="target" position={targetPosition} className="handle" />

        <div className="artifact-header">
            <div className="artifact-header-icon">
                {data.data?.dataType === 'asset' ? <Database size={12} /> : <FileCode size={12} />}
            </div>
            <div className="artifact-name" title={data.label}>{data.label}</div>
        </div>

        <div className="artifact-body">
          {data.framework && (
             <div className={`artifact-badge ${config.className}`}>
                {(() => {
                  const framework = data.framework.toLowerCase();
                  if (framework.includes('github')) return <SiGithub size={8} />;
                  if (framework.includes('gitlab')) return <SiGitlab size={8} />;
                  if (framework.includes('dvc')) return <SiDvc size={8} />;
                  if (framework.includes('dagster')) return <Database size={8} />;
                  return <GitBranch size={8} />;
                })()}
                <span>{data.framework}</span>
             </div>
          )}
          {data.data?.contents && (
            <div className="folder-preview">
              {data.data.contents.slice(0, 1).map((item: string) => (
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
      </div>

      <div className="node-body">
        {data.framework && (
          <div className="node-meta">
            {(() => {
              const framework = data.framework.toLowerCase();
              if (framework.includes('github')) return <SiGithub size={12} style={{ marginRight: 4 }} />;
              if (framework.includes('gitlab')) return <SiGitlab size={12} style={{ marginRight: 4 }} />;
              if (framework.includes('dvc')) return <SiDvc size={12} style={{ marginRight: 4 }} />;
              if (framework.includes('dagster')) return <Database size={12} style={{ marginRight: 4 }} />;
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
        
        .pipeline-node-item.selected {
          border-color: #f20d63 !important;
          box-shadow: 0 0 20px rgba(242, 13, 99, 0.6) !important;
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
