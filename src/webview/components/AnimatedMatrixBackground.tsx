import React, { useEffect, useRef } from 'react';

type MatrixVariant = 'characters' | 'dots';

interface AnimatedMatrixBackgroundProps {
    variant?: MatrixVariant;
    className?: string;
}

interface DotParticle {
    x: number;
    y: number;
    baseX: number;
    baseY: number;
    vx: number;
    vy: number;
    opacity: number;
}

const CHARACTER_SET =
    '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
const CHARACTER_FONT_SIZE = 14;
const CHARACTER_FRAME_MS = 55;
const DOT_GRID_SIZE = 22;
const DOT_RADIUS = 1.4;

export const AnimatedMatrixBackground: React.FC<AnimatedMatrixBackgroundProps> = ({
    variant = 'dots',
    className,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        let animationFrameId = 0;
        let intervalId: number | null = null;
        let drops: number[] = [];
        let particles: DotParticle[] = [];
        const size = { width: 0, height: 0 };

        const initializeState = () => {
            if (variant === 'characters') {
                const columns = Math.max(1, Math.floor(size.width / CHARACTER_FONT_SIZE));
                const rows = Math.max(1, Math.floor(size.height / CHARACTER_FONT_SIZE));
                drops = Array.from({ length: columns }, () => Math.floor(Math.random() * rows));
                return;
            }

            particles = [];
            for (let x = 0; x <= size.width + DOT_GRID_SIZE; x += DOT_GRID_SIZE) {
                for (let y = 0; y <= size.height + DOT_GRID_SIZE; y += DOT_GRID_SIZE) {
                    particles.push({
                        x,
                        y,
                        baseX: x,
                        baseY: y,
                        vx: (Math.random() - 0.5) * 0.25,
                        vy: (Math.random() - 0.5) * 0.25,
                        opacity: Math.random() * 0.45 + 0.2,
                    });
                }
            }
        };

        const resizeCanvas = () => {
            const parentRect = canvas.parentElement?.getBoundingClientRect();
            const cssWidth = Math.max(1, Math.floor(parentRect?.width ?? window.innerWidth));
            const cssHeight = Math.max(1, Math.floor(parentRect?.height ?? window.innerHeight));
            const dpr = window.devicePixelRatio || 1;

            canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
            canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
            canvas.style.width = `${cssWidth}px`;
            canvas.style.height = `${cssHeight}px`;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            size.width = cssWidth;
            size.height = cssHeight;
            initializeState();

            ctx.fillStyle = '#181b28';
            ctx.fillRect(0, 0, size.width, size.height);
        };

        const drawCharacters = () => {
            ctx.fillStyle = 'rgba(24, 27, 40, 0.08)';
            ctx.fillRect(0, 0, size.width, size.height);

            ctx.fillStyle = '#1e2031';
            ctx.font = `${CHARACTER_FONT_SIZE}px monospace`;

            for (let i = 0; i < drops.length; i += 1) {
                const text = CHARACTER_SET[Math.floor(Math.random() * CHARACTER_SET.length)];
                const x = i * CHARACTER_FONT_SIZE;
                const y = drops[i] * CHARACTER_FONT_SIZE;

                ctx.fillText(text, x, y);

                if (y > size.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }

                drops[i] += 1;
            }
        };

        const drawDots = (timeMs: number) => {
            const time = timeMs * 0.001;

            ctx.fillStyle = 'rgba(24, 27, 40, 0.16)';
            ctx.fillRect(0, 0, size.width, size.height);

            for (let i = 0; i < particles.length; i += 1) {
                const particle = particles[i];

                particle.x += particle.vx;
                particle.y += particle.vy;

                particle.x += (particle.baseX - particle.x) * 0.05;
                particle.y += (particle.baseY - particle.y) * 0.05;

                const waveX = Math.sin((particle.baseY + time * 130) * 0.02) * 0.35;
                const waveY = Math.cos((particle.baseX + time * 120) * 0.02) * 0.35;

                ctx.fillStyle = `rgba(30, 32, 49, ${particle.opacity})`;
                ctx.beginPath();
                ctx.arc(particle.x + waveX, particle.y + waveY, DOT_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        if (variant === 'characters') {
            intervalId = window.setInterval(drawCharacters, CHARACTER_FRAME_MS);
        } else {
            const animate = (timeMs: number) => {
                drawDots(timeMs);
                animationFrameId = window.requestAnimationFrame(animate);
            };

            animationFrameId = window.requestAnimationFrame(animate);
        }

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (intervalId !== null) {
                window.clearInterval(intervalId);
            }
            if (animationFrameId) {
                window.cancelAnimationFrame(animationFrameId);
            }
        };
    }, [variant]);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className={className}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                pointerEvents: 'none',
                background: '#181b28',
            }}
        />
    );
};
