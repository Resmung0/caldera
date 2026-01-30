import { Handle, Position, NodeProps } from 'reactflow';
import {
  CheckCircle,
  XCircle,
  Clock,
  Terminal,
  GitBranch
} from 'lucide-react';
import { SiGithub, SiGitlab, SiDvc } from 'react-icons/si';
import { FiDatabase } from 'react-icons/fi';
import { LuImage, LuTable2, LuVideo, LuMusic4 } from 'react-icons/lu';

export const PipelineNodeItem = ({ data, id }: NodeProps) => {
  const { layoutDirection = 'TB', isSelectionMode = false, isSelected = false, type } = data;

  const targetPosition = layoutDirection === 'LR' ? Position.Left : Position.Top;
  const sourcePosition = layoutDirection === 'LR' ? Position.Right : Position.Bottom;

  const isArtifact = type === 'artifact';

  // Determine icon based on status or type if available
  const getStatusIcon = () => {
    switch (data.status) {
      case 'success': return <CheckCircle size={16} color="#4ade80" />;
      case 'failed': return <XCircle size={16} color="#ef4444" />;
      case 'running': return <Clock size={16} color="#3b82f6" />;
      default: return <Terminal size={16} color="#a0aec0" />;
    }
  };

  const getDataTypeIcon = (dataType: string) => {
    switch (dataType) {
      case 'image': return <LuImage size={12} />;
      case 'table': return <LuTable2 size={12} />;
      case 'video': return <LuVideo size={12} />;
      case 'audio': return <LuMusic4 size={12} />;
      default: return null;
    }
  };

  if (isArtifact) {
    return (
      <div className={`pipeline-node-item artifact ${isSelectionMode ? 'selection-mode' : ''} ${isSelected ? 'selected' : ''}`}>
        <Handle type="target" position={targetPosition} className="handle" />

        <div className="artifact-content">
          <div className="artifact-icon">
            <FiDatabase size={24} />
          </div>
          <div className="artifact-info">
            <div className="artifact-name" title={data.label}>{data.label}</div>
            {data.dataType && data.dataType !== 'other' && (
              <div className="artifact-badge">
                {getDataTypeIcon(data.dataType)}
                <span>{data.dataType}</span>
              </div>
            )}
          </div>
        </div>

        <Handle type="source" position={sourcePosition} className="handle" />

        <style>{`
                    .pipeline-node-item.artifact {
                        width: 220px;
                        height: 60px;
                        border-radius: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: flex-start;
                        padding: 0 20px;
                        background: var(--color-bg-primary);
                        border: 2px solid #2b2e3c;
                        transition: all 0.3s ease;
                    }

                    .artifact-content {
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        gap: 12px;
                        width: 100%;
                        color: var(--color-text-primary);
                    }

                    .artifact-icon {
                        color: var(--color-text-primary);
                        display: flex;
                        align-items: center;
                        opacity: 0.9;
                    }

                    .artifact-info {
                        display: flex;
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 2px;
                        overflow: hidden;
                    }

                    .artifact-name {
                        font-size: 14px;
                        font-weight: 600;
                        max-width: 140px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .artifact-badge {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        background: rgba(14, 165, 233, 0.1);
                        border: 1px solid rgba(14, 165, 233, 0.3);
                        border-radius: 12px;
                        padding: 1px 6px;
                        font-size: 9px;
                        color: #0ea5e9;
                        text-transform: capitalize;
                    }
                `}</style>
      </div>
    );
  }

  return (
    <div className={`pipeline-node-item ${isSelectionMode ? 'selection-mode' : ''} ${isSelected ? 'selected' : ''}`}>
      <Handle type="target" position={targetPosition} className="handle" />

      <div className="node-header">
        <div className="node-icon">
          {getStatusIcon()}
        </div>
        <div className="node-title">{data.label}</div>
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
        <div className="node-status">
          {data.status || 'Idle'}
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
          width: 200px;
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
            border-radius: 50%;
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
      `}</style>
    </div>
  );
};
