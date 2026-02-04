import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { getToolIcon } from './toolIcons';

interface EmptyStateProps {
    category: string;
    tools: string[];
}

export const EmptyState: React.FC<EmptyStateProps> = ({ category, tools }) => {
    // Use a fixed radius that works well with the design
    const radius = 160;

    // Precompute planet configs to avoid redundant calculations
    const planetConfigs = useMemo(
        () =>
            tools.length > 0
                ? tools.map((tool, index) => ({
                    tool,
                    Icon: getToolIcon(tool),
                    angle: (360 / tools.length) * index,
                }))
                : [],
        [tools],
    );

    return (
        <div className="empty-state-container">
            <AlertTriangle size={48} className="empty-state-icon" />
            <h2 className="empty-state-title">
                No pipeline files for category '{category}' were found.
            </h2>
            <p className="empty-state-subtitle">
                We recommend you create a pipeline file for one of the following tools to enable visualization:
            </p>

            <div className="orbit-system-container">
                {/* Central marker/sun */}
                <div className="orbit-center-marker" />

                {/* The Orbit Path Visual */}
                <div className="orbit-path-circle" />

                {/* Rotating Container */}
                {planetConfigs.length > 0 && (
                    <motion.div
                        className="orbit-rotator"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                    >
                        {planetConfigs.map(({ tool, Icon, angle }) => (
                            <div
                                key={tool}
                                className="orbit-planet"
                                style={{
                                    transform: `rotate(${angle}deg) translate(${radius}px)`,
                                }}
                            >
                                <motion.div
                                    className="orbit-planet-content"
                                    animate={{ rotate: [-angle, -angle - 360] }}
                                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                                >
                                    {Icon && <Icon className="planet-icon" />}
                                    <span className="planet-label">{tool}</span>
                                </motion.div>
                            </div>
                        ))}
                    </motion.div>
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
          overflow: hidden;
          position: relative;
        }
        .empty-state-icon {
          margin-bottom: 24px;
          color: #ffcc02;
          filter: drop-shadow(0 0 8px rgba(255, 204, 2, 0.3));
          position: relative;
          z-index: 10;
        }
        .empty-state-title {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 400;
          color: #ffffff;
          line-height: 1.4;
          max-width: 600px;
          position: relative;
          z-index: 10;
        }
        .empty-state-subtitle {
          margin: 0 0 24px 0;
          font-size: 14px;
          color: #9d9d9d;
          line-height: 1.5;
          max-width: 500px;
          position: relative;
          z-index: 10;
        }

        .orbit-system-container {
            position: relative;
            width: 400px;
            height: 400px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 20px;
        }

        .orbit-center-marker {
            position: absolute;
            width: 8px;
            height: 8px;
            background-color: #f20d63;
            border-radius: 50%;
            box-shadow: 0 0 20px #f20d63;
            z-index: 5;
        }

        .orbit-path-circle {
            position: absolute;
            width: 320px;
            height: 320px;
            border: 1px dashed rgba(71, 76, 96, 0.3);
            border-radius: 50%;
            pointer-events: none;
        }

        .orbit-rotator {
            position: absolute;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .orbit-planet {
            position: absolute;
            top: 50%;
            left: 50%;
            transform-origin: center;
        }

        .orbit-planet-content {
            background-color: #1f2332;
            border: 1px solid #3e3e42;
            padding: 10px 18px;
            border-radius: 24px;
            display: flex;
            align-items: center;
            gap: 10px;
            color: #eeeeee;
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transform: translate(-50%, -50%);
        }
        
        .orbit-planet-content:hover {
            border-color: #f20d63;
            box-shadow: 0 0 15px rgba(242, 13, 99, 0.4);
            color: #ffffff;
            cursor: pointer;
            z-index: 100;
        }

        .planet-icon {
            font-size: 18px;
            color: #f20d63;
        }
      `}</style>
        </div>
    );
};
