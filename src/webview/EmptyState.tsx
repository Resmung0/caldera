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
          padding: 40px 20px;
          color: #cccccc;
          background-color: #181B28;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }
        .empty-state-icon {
          margin-bottom: 24px;
          color: #ffcc02;
          filter: drop-shadow(0 0 8px rgba(255, 204, 2, 0.3));
        }
        .empty-state-title {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 400;
          color: #ffffff;
          line-height: 1.4;
          max-width: 600px;
        }
        .empty-state-subtitle {
          margin: 0 0 24px 0;
          font-size: 14px;
          color: #9d9d9d;
          line-height: 1.5;
          max-width: 500px;
        }
        .empty-state-tools {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 400px;
        }
        .empty-state-tool-tag {
          padding: 8px 16px;
          border-radius: 6px;
          background-color: #181B28;
          color: #cccccc;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid #3e3e42;
          transition: all 0.2s ease;
        }
        .empty-state-tool-tag:hover {
          background-color: #1f2332;
          border-color: #f20d63;
          transform: translateY(-1px);
          box-shadow: 0 0 15px rgba(242, 13, 99, 0.4), 0 0 25px rgba(242, 13, 99, 0.2);
        }
      `}</style>
    </div>
  );
};
