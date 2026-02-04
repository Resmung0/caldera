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
    githubaction: SiGithub,
    gitlabci: SiGitlab,
    jenkins: SiJenkins,
    airflow: SiApacheairflow,
    apacheairflow: SiApacheairflow,
    prefect: SiPrefect,
    circleci: SiCircleci,
    travis: SiTravisci,
    travisci: SiTravisci,
    kedro: SiKedro,
    uipath: SiUipath,
  };

  return iconMap[normalized] || null;
};

export const EmptyState: React.FC<EmptyStateProps> = ({ category, tools }) => {
  // Use a fixed radius that works well with the design
  const radius = 160;

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
        <motion.div
          className="orbit-rotator"
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
          {tools.map((tool, index) => {
            const Icon = getToolIcon(tool);
            // Distribute tools evenly around the circle
            const angle = (360 / tools.length) * index;

            return (
              <motion.div
                key={tool}
                className="orbit-planet-slot"
                style={{
                  rotate: angle, // Static rotation to position the slot direction
                }}
              >
                <div
                  className="orbit-planet-arm"
                  style={{
                    width: radius, // Arm length pushes the planet out
                  }}
                >
                  <motion.div
                    className="orbit-planet-widget"
                    // Counter-rotate to keep text upright as the parent rotates.
                    // We animate from the initial negative angle to that angle minus 360 degrees
                    // to complete a full counter-rotation cycle synchronized with the main rotator.
                    animate={{ rotate: [-angle, -angle - 360] }}
                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                    style={{
                      rotate: -angle
                    }}
                  >
                    {Icon && <Icon className="planet-icon" />}
                    <span className="planet-label">{tool}</span>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
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
            /* The rotator spins the entire system */
        }

        /* 
           The Slot is centered in the container, rotated to point in the direction of the planet.
        */
        .orbit-planet-slot {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            display: flex;
            align-items: center;
            justify-content: flex-start;
        }
        
        /* 
           The Arm extends from the center (Slot) to the radius.
           Flex content is aligned to flex-end so the Widget sits at the tip.
        */
        .orbit-planet-arm {
            position: absolute;
            left: 0;
            top: 0;
            height: 0;
            transform-origin: left center;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            pointer-events: none; /* Let clicks pass through the arm space */
        }

        .orbit-planet-widget {
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
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            pointer-events: auto; /* Re-enable pointer events for the widget */
            
            /* Center the widget on the end of the arm tip (radius point). */
            /* Using translate(-50%, 0) centers it horizontally on the anchor point. */
            transform: translate(-50%, 0); 
        }
        
        .orbit-planet-widget:hover {
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
