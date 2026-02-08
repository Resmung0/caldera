
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LucideIcon } from 'lucide-react';

export interface NodeDropdownProps {
    icon: LucideIcon;
    label: string;
    isExpanded: boolean;
    onToggle: (e: React.MouseEvent) => void;
    items: Record<string, any> | any[];
    variant: 'params' | 'deps';
}

export const NodeDropdown: React.FC<NodeDropdownProps> = ({
    icon: Icon,
    label,
    isExpanded,
    onToggle,
    items,
    variant,
}) => {
    const isParams = variant === 'params';
    const badgeClass = isParams ? 'params-badge' : 'deps-badge';

    // Prepare items for rendering
    const renderItems = () => {
        if (Array.isArray(items)) {
            return items.map((item, index) => {
                // Handle list items which might be objects like { path: ... } or strings
                const displayKey = item && item.path ? item.path.split('/').pop() : String(index + 1);
                const displayVal = item && item.path ? item.path : String(item);
                return (
                    <div key={index} className="param-item">
                        <span className="param-key">{displayKey}</span>
                        <span className="param-val" title={displayVal}>{displayVal}</span>
                    </div>
                );
            });
        }

        return Object.entries(items).map(([key, val]) => (
            <div key={key} className="param-item">
                <span className="param-key">{key}:</span>
                <span className="param-val" title={String(val)}>
                    {typeof val === 'object' ? '{...}' : String(val)}
                </span>
            </div>
        ));
    };

    return (
        <div className="node-dropdown-container">
            <div
                className={badgeClass}
                onClick={onToggle}
            >
                <Icon size={10} />
                <span>{label}</span>
                <motion.div
                    initial={false}
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', alignItems: 'center' }}
                >
                    <ChevronDown size={10} />
                </motion.div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        className="params-dropdown"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderItems()}
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
        .params-badge, .deps-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(242, 13, 99, 0.1);
          border: 1px solid rgba(242, 13, 99, 0.3);
          border-radius: 10px;
          padding: 2px 8px;
          font-size: 10px;
          color: #f20d63;
          cursor: pointer;
          width: fit-content;
        }
        .deps-badge {
          background: rgba(128, 31, 239, 0.1);
          border-color: rgba(128, 31, 239, 0.3);
          color: #891fff;
        }
        .params-dropdown {
          margin-top: 4px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          max-width: 100%;
          overflow: hidden;
        }
        .param-item {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          gap: 8px;
          overflow: hidden;
        }
        .param-key {
          color: #a0aec0;
          white-space: nowrap;
          margin-right: 8px;
        }
        .param-val {
          color: #fff;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
        </div>
    );
};
