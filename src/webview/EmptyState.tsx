import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface EmptyStateProps {
  category: string;
  tools: string[];
}

export const EmptyState: React.FC<EmptyStateProps> = ({ category, tools }) => {
  return (
    <div className="empty-state-container">
      <AlertTriangle size={48} className="empty-state-icon" />
      <h2 className="empty-state-title">
        No pipeline files for category '{category}' were found.
      </h2>
      <p className="empty-state-subtitle">
        We recommend you create a pipeline file for one of the following tools to enable visualization:
      </p>
      <div className="empty-state-tools">
        {tools.map(tool => (
          <span key={tool} className="empty-state-tool-tag">
            {tool}
          </span>
        ))}
      </div>
      <style>{`
        .empty-state-container {
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 20px;
          color: var(--vscode-editor-foreground);
          background-color: var(--vscode-editor-background);
        }
        .empty-state-icon {
          margin-bottom: 20px;
          color: var(--vscode-editorWarning-foreground);
        }
        .empty-state-title {
          margin: 0 0 10px 0;
          font-size: 1.2em;
        }
        .empty-state-subtitle {
          margin: 0;
          font-size: 0.9em;
          color: var(--vscode-editorHint-foreground);
        }
        .empty-state-tools {
          margin-top: 15px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .empty-state-tool-tag {
          padding: 5px 10px;
          border-radius: 4px;
          background-color: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
        }
      `}</style>
    </div>
  );
};
