import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Workflow, Sparkle, Bot, Activity } from 'lucide-react';

interface TopPanelProps {
    onCategorySelect: (category: string) => void;
    activeCategory: string;
    isRunning?: boolean;
}

export const TopPanel: React.FC<TopPanelProps> = ({ onCategorySelect, activeCategory, isRunning = false }) => {
    const [activeContext, setActiveContext] = useState<string>(activeCategory || 'cicd');

    // Update local state when activeCategory prop changes
    useEffect(() => {
        if (activeCategory && activeCategory !== activeContext) {
            setActiveContext(activeCategory);
        }
    }, [activeCategory, activeContext]);

    const contexts = [
        { id: 'cicd', icon: Workflow, label: 'CI/CD', color: '#10B981' },
        { id: 'data-processing', icon: Activity, label: 'Data Processing', color: '#8B5CF6' },
        { id: 'ai-agent', icon: Sparkle, label: 'AI Agent', color: '#EC4899' },
        { id: 'rpa', icon: Bot, label: 'Automation', color: '#EF4444' },
    ];

    return (
        <div className="top-panel">
            {contexts.map((ctx, index) => {
                const Icon = ctx.icon;
                const isActive = activeContext === ctx.id;
                const isLast = index === contexts.length - 1;
                return (
                    <React.Fragment key={ctx.id}>
                        <button
                            className={`context-tab ${isActive ? 'active' : ''}`}
                            onClick={() => {
                                setActiveContext(ctx.id);
                                onCategorySelect(ctx.id);
                            }}
                            style={{ '--active-color': ctx.color } as React.CSSProperties}
                        >
                            <AnimatePresence>
                                {isActive && isRunning && (
                                    <motion.div
                                        className="run-fill"
                                        initial={{ width: '0%' }}
                                        animate={{ width: '100%' }}
                                        exit={{ opacity: 0 }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "linear"
                                        }}
                                    />
                                )}
                            </AnimatePresence>
                            <Icon size={16} style={{ position: 'relative', zIndex: 1 }} />
                            <span className="tab-label" style={{ position: 'relative', zIndex: 1 }}>{ctx.label}</span>
                        </button>
                        {!isLast && <div className="separator">|</div>}
                    </React.Fragment>
                );
            })}
            <style>{`
        .top-panel {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          background: rgba(30, 32, 49, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 100;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
          padding: 2px;
        }
        .context-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          position: relative;
          border-radius: 6px;
          overflow: hidden;
        }
        .context-tab:hover:not(.active) {
          color: rgba(255, 255, 255, 0.8);
          background: rgba(255, 255, 255, 0.05);
        }
        .context-tab.active {
          color: white;
          background: #f20d63;
          box-shadow: 0 2px 8px rgba(242, 13, 99, 0.4);
        }
        .run-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: var(--active-color);
          z-index: 0;
          opacity: 0.8;
        }
        .tab-label {
          font-size: 12px;
          font-weight: 500;
        }
        .separator {
          color: rgba(255, 255, 255, 0.3);
          font-size: 14px;
          font-weight: 300;
          margin: 0 2px;
          user-select: none;
        }
      `}</style>
        </div>
    );
};
