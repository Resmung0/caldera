import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  SiLangchain,
  SiDvc,
  SiApacheairflow,
  SiKedro,
  SiGithubactions,
  SiGitlab,
  SiUipath
} from 'react-icons/si';

const iconMap: { [key: string]: React.ElementType } = {
  'langchain': SiLangchain,
  'dvc': SiDvc,
  'airflow': SiApacheairflow,
  'kedro': SiKedro,
  'github action': SiGithubactions,
  'github actions': SiGithubactions,
  'gitlab ci': SiGitlab,
  'uipath': SiUipath,
};

interface EmptyStateProps {
  category: string;
  tools: string[];
}

export const EmptyState: React.FC<EmptyStateProps> = ({ category, tools }) => {
  const radius = 120;
  const isOrbiting = tools.length > 1;

  return (
    <div className="empty-state-container">
      <AlertTriangle size={48} className="empty-state-icon" />
      <h2 className="empty-state-title">
        No pipeline files for category '{category}' were found.
      </h2>
      <p className="empty-state-subtitle">
        We recommend you create a pipeline file for one of the following tools to enable visualization:
      </p>
      <div className={`empty-state-tools ${isOrbiting ? 'orbiting' : ''}`}>
        {isOrbiting ? (
          <div className="orbit-wrapper">
            <motion.div
              className="orbit-container"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              {tools.map((tool, index) => {
                const Icon = iconMap[tool.toLowerCase()] || AlertTriangle;
                const angle = (index / tools.length) * 2 * Math.PI;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                return (
                  <div
                    key={tool}
                    className="orbit-item"
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
                    }}
                  >
                    <motion.div
                      className="empty-state-tool-tag"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
                    >
                      <Icon size={16} />
                      <span>{tool}</span>
                    </motion.div>
                  </div>
                );
              })}
            </motion.div>
          </div>
        ) : (
          tools.map(tool => {
            const Icon = iconMap[tool.toLowerCase()] || AlertTriangle;
            return (
              <span key={tool} className="empty-state-tool-tag" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon size={16} />
                {tool}
              </span>
            );
          })
        )}
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
          min-height: 100px;
        }
        .empty-state-tools.orbiting {
          min-height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .orbit-wrapper {
          position: relative;
          width: 0;
          height: 0;
        }
        .orbit-container {
          position: relative;
          width: 0;
          height: 0;
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
