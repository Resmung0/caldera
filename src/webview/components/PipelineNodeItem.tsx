import { Handle, Position, NodeProps } from 'reactflow';
import {
    CheckCircle,
    XCircle,
    Clock,
    Terminal,
    GitBranch
} from 'lucide-react';
import { SiGithub, SiGitlab, SiDvc } from 'react-icons/si';

export const PipelineNodeItem = ({ data }: NodeProps) => {
    const { layoutDirection = 'TB', isSelectionMode = false, isSelected = false } = data;

    const targetPosition = layoutDirection === 'LR' ? Position.Left : Position.Top;
    const sourcePosition = layoutDirection === 'LR' ? Position.Right : Position.Bottom;

    // Determine icon based on status or type if available
    const getStatusIcon = () => {
        switch (data.status) {
            case 'success': return <CheckCircle size={16} color="#4ade80" />;
            case 'failed': return <XCircle size={16} color="#ef4444" />;
            case 'running': return <Clock size={16} color="#3b82f6" />;
            default: return <Terminal size={16} color="#a0aec0" />;
        }
    };

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
