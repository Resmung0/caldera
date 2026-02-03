import { useLayoutEffect, useRef } from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';
import { animate } from 'animejs';

interface AnimatedEdgeData {
    status?: 'idle' | 'processing' | 'success' | 'failed';
}

export const AnimatedEdge: React.FC<EdgeProps<AnimatedEdgeData>> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
}) => {
    const energyPathRef = useRef<SVGPathElement>(null);
    const animationRef = useRef<ReturnType<typeof animate> | null>(null);

    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const isProcessing = data?.status === 'processing';
    const isFailed = data?.status === 'failed';

    // Energy beam animation - continuous flowing beam
    useLayoutEffect(() => {
        if (!energyPathRef.current) return;

        // Clean up previous animation
        if (animationRef.current) {
            animationRef.current.pause();
            animationRef.current = null;
        }

        if (isProcessing) {
            const pathLength = energyPathRef.current.getTotalLength();

            // Create a longer, more visible beam (40% of path length)
            const beamLength = Math.max(pathLength * 0.4, 50); // At least 50px long
            const gapLength = pathLength - beamLength;

            // Set up the dash pattern: beam followed by gap
            energyPathRef.current.style.strokeDasharray = `${beamLength} ${gapLength}`;
            energyPathRef.current.style.strokeDashoffset = `${pathLength}`;
            energyPathRef.current.style.opacity = '1';

            // Animate the beam traveling from source to target
            animationRef.current = animate(energyPathRef.current, {
                strokeDashoffset: [pathLength, 0],
                ease: 'linear',
                duration: 2000, // Slower animation for better visibility
                complete: () => {
                    // After beam reaches the end, fade it out
                    if (energyPathRef.current) {
                        animate(energyPathRef.current, {
                            opacity: [1, 0],
                            duration: 300,
                            ease: 'out',
                        });
                    }
                }
            });
        } else {
            // Reset when not processing
            energyPathRef.current.style.opacity = '0';
            energyPathRef.current.style.strokeDasharray = 'none';
            energyPathRef.current.style.strokeDashoffset = '0';
        }

        return () => {
            if (animationRef.current) {
                animationRef.current.pause();
                animationRef.current = null;
            }
        };
    }, [isProcessing]);

    // Get stroke color for failed state
    const getBaseStrokeColor = () => {
        if (isFailed) return '#891fff';
        return '#474c60';
    };

    const getBaseGlow = () => {
        if (isFailed) return 'drop-shadow(0 0 6px #891fff)';
        return 'none';
    };

    return (
        <>
            {/* Base edge path */}
            <path
                id={id}
                style={{
                    ...style,
                    strokeWidth: 2,
                    stroke: getBaseStrokeColor(),
                    filter: getBaseGlow(),
                }}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={markerEnd}
            />

            {/* Energy beam overlay - magenta beam that travels along the path */}
            <path
                ref={energyPathRef}
                d={edgePath}
                fill="none"
                stroke="#f20d63"
                strokeWidth={4}
                strokeLinecap="round"
                style={{
                    filter: 'drop-shadow(0 0 8px #f20d63) drop-shadow(0 0 4px #f20d63)',
                    opacity: 0,
                    pointerEvents: 'none',
                }}
            />
        </>
    );
};

export default AnimatedEdge;
