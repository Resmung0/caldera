import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import {
  SiLangchain,
  SiDvc,
  SiGithub,
  SiGitlab,
  SiJenkins,
  SiApacheairflow,
  SiPrefect,
  SiCircleci,
  SiTravisci,
  SiKedro,
  SiUipath
} from 'react-icons/si';
import { IconType } from 'react-icons';

interface EmptyStateProps {
  category: string;
  tools: string[];
}

const getToolIcon = (toolName: string): IconType | null => {
  const normalized = toolName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const iconMap: Record<string, IconType> = {
    langchain: SiLangchain,
    dvc: SiDvc,
    gitlabci: SiGitlab,
    githubaction: SiGithub,
    jenkins: SiJenkins,
    airflow: SiApacheairflow,
    prefect: SiPrefect,
    circleci: SiCircleci,
    travis: SiTravisci,
    kedro: SiKedro,
    uipath: SiUipath,
  };

  return iconMap[normalized] || null;
};

export const EmptyState: React.FC<EmptyStateProps> = ({ category, tools }) => {
  const showOrbit = tools.length > 1;

  const toolElements = useMemo(() => {
    return tools.map(tool => {
      const Icon = getToolIcon(tool);
      return (
        <span key={tool} className="empty-state-tool-tag">
          {Icon && <Icon className="tool-icon" />}
          {tool}
        </span>
      );
    });
  }, [tools]);

  return (
    <div className="empty-state-container">
      <AlertTriangle size={48} className="empty-state-icon" />
      <h2 className="empty-state-title">
        No pipeline files for category '{category}' were found.
      </h2>
      <p className="empty-state-subtitle">
        We recommend you create a pipeline file for one of the following tools to enable visualization:
      </p>

      <div className="empty-state-tools-wrapper">
        {showOrbit && (
          <motion.div
            className="orbit-circle"
            animate={{ rotate: 360 }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <div className="orbit-dot" />
          </motion.div>
        )}
        <div className="empty-state-tools">
          {toolElements}
        </div>
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
          overflow: hidden;
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
        .empty-state-tools-wrapper {
            position: relative;
            padding: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .orbit-circle {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 50%;
            border: 1px solid rgba(242, 13, 99, 0.2);
            pointer-events: none;
        }
        .orbit-dot {
            position: absolute;
            top: -4px;
            left: 50%;
            width: 8px;
            height: 8px;
            background-color: #f20d63;
            border-radius: 50%;
            box-shadow: 0 0 10px #f20d63;
            transform: translateX(-50%);
        }
        .empty-state-tools {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 400px;
          z-index: 1;
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
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tool-icon {
            font-size: 16px;
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
