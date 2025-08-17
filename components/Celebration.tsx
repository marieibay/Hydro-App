
import React, { useEffect, useRef } from 'react';

interface CelebrationProps {
    onClose: () => void;
}

interface ConfettiParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    a: number;
    color: string;
}

export const Celebration: React.FC<CelebrationProps> = ({ onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        const confettiParts: ConfettiParticle[] = [];
        const colors = ['#ffd12b', '#5be7ff', '#ff8a5b', '#a7c5f4'];

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        const startConfetti = () => {
            for (let i = 0; i < 120; i++) {
                confettiParts.push({
                    x: Math.random() * canvas.width,
                    y: -10 - Math.random() * 200,
                    vx: (Math.random() - 0.5) * 40,
                    vy: 60 + Math.random() * 80,
                    r: 2 + Math.random() * 3,
                    a: 1,
                    color: colors[i % colors.length],
                });
            }
        };

        let lastTime = performance.now();
        const loop = (timestamp: number) => {
            const dt = (timestamp - lastTime) / 1000;
            lastTime = timestamp;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = confettiParts.length - 1; i >= 0; i--) {
                const p = confettiParts[i];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.a -= 0.35 * dt;

                if (p.y > canvas.height || p.a <= 0) {
                    confettiParts.splice(i, 1);
                } else {
                    ctx.globalAlpha = Math.max(0, p.a);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(p.x, p.y, p.r, p.r);
                }
            }
            ctx.globalAlpha = 1;
            animationFrameId = requestAnimationFrame(loop);
        };

        startConfetti();
        animationFrameId = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-[70] p-4">
            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[71]" />
            <div className="bg-[--cabinet] border-4 border-[#0e2d66] shadow-[inset_0_0_0_4px_#0b2f6a] rounded-lg p-4 text-center z-[72] w-[min(400px,90vw)]">
                <h2 className="m-0 mb-2 text-[#ffd12b] text-lg">GOAL ACHIEVED!</h2>
                <p className="m-0 mb-3 text-[#a7c5f4] text-xs">Nice work — your fish is proud of you. 🎉</p>
                <button 
                    onClick={onClose}
                    className="inline-block py-2 px-3.5 bg-black border-4 border-[#0e2d66] shadow-[inset_0_0_0_4px_#0b2f6a] text-[#ffd12b] rounded-md cursor-pointer"
                >
                    OK
                </button>
            </div>
        </div>
    );
};
