import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { getToolIcon } from '../../toolIcons';
import styles from './EmptyState.module.css';
import { EmptyStateProps } from './EmptyState.types';
import { Logo } from '../Logo';

export const EmptyState: React.FC<EmptyStateProps> = ({
    category,
    tools,
    containerSize = 400,
    orbitSize = 320,
}) => {
    const orbitRadius = orbitSize / 2;

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
        <section
            className={styles.emptyStateContainer}
            role="status"
            aria-label="No pipeline files found"
        >
            <AlertTriangle
                size={48}
                className={styles.emptyStateIcon}
                aria-hidden="true"
                focusable="false"
            />
            <h2 className={styles.emptyStateTitle}>
                No pipeline files for category '{category}' were found.
            </h2>
            <p className={styles.emptyStateSubtitle}>
                We recommend you create a pipeline file for one of the following tools to enable visualization:
            </p>

            <div
                className={styles.orbitSystemContainer}
                style={
                    {
                        '--orbit-container-size': `${containerSize}px`,
                        '--orbit-size': `${orbitSize}px`,
                        '--orbit-radius': `${orbitRadius}px`,
                    } as React.CSSProperties
                }
            >
                {/* Central Logo */}
                <div className={styles.orbitCenterLogo}>
                    <Logo size={64} />
                </div>

                {/* The Orbit Path Visual */}
                <div className={styles.orbitPathCircle} />

                {/* Rotating Container */}
                {planetConfigs.length > 0 && (
                    <motion.div
                        className={styles.orbitRotator}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                    >
                        {planetConfigs.map(({ tool, Icon, angle }) => (
                            <div
                                key={tool}
                                className={styles.orbitPlanet}
                                style={{
                                    transform: `rotate(${angle}deg) translate(${orbitRadius}px)`,
                                }}
                            >
                                <motion.div
                                    className={styles.orbitPlanetContent}
                                    animate={{ rotate: [-angle, -angle - 360] }}
                                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                                >
                                    {Icon && <Icon className={styles.planetIcon} />}
                                    <span className={styles.planetLabel}>{tool}</span>
                                </motion.div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </div>
        </section>
    );
};
