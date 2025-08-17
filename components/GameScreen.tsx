
import React, { useRef, useEffect, forwardRef } from 'react';
import { useFishSprite } from '../hooks/useFishSprite';
import { GameState, Mood } from '../types';
import { drawPixelClown, drawBubbles, drawFood, drawRipples } from '../lib/drawing';

interface GameScreenProps {
    gameState: GameState;
    percentage: number;
    mood: Mood;
    onDropFood: (x: number, y: number) => void;
    onPokeFish: (x: number, y: number) => void;
    unlockAudio: () => void;
}

export const GameScreen = forwardRef<HTMLDivElement, GameScreenProps>(({ gameState, percentage, mood, onDropFood, onPokeFish, unlockAudio }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sprite = useFishSprite(mood);
    const hasWater = percentage > 0;

    useEffect(() => {
        const canvas = canvasRef.current;
        const screen = (ref as React.RefObject<HTMLDivElement>)?.current;
        if (!canvas || !screen) return;

        const resizeCanvas = () => {
            const rect = screen.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                canvas.width = rect.width;
                canvas.height = rect.height;
            }
        };

        const resizeObserver = new ResizeObserver(resizeCanvas);
        resizeObserver.observe(screen);
        resizeCanvas();

        return () => resizeObserver.disconnect();
    }, [ref]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas || !sprite.isReady) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (!hasWater) return;

        drawBubbles(ctx, gameState.bubbles, canvas, percentage);
        drawFood(ctx, gameState.foods);
        drawPixelClown(ctx, gameState.fish, mood, sprite, canvas);
        drawRipples(ctx, gameState.ripples);

    }, [gameState, percentage, mood, sprite, hasWater]);

    const waterFilterStyle = () => {
        // When sick, the water should look purplish
        if (mood === 'sick') return 'hue-rotate(320deg) saturate(0.7) brightness(0.75)';
        // When in SOS, the water should look greenish and murky
        if (mood === 'sos') return 'hue-rotate(80deg) saturate(0.6) brightness(0.7)';
        return 'none';
    };

    const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const screen = (ref as React.RefObject<HTMLDivElement>)?.current;
        if (!screen || percentage === 0) return;
        const rect = screen.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        onDropFood(x, y);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        unlockAudio();
        const screen = (ref as React.RefObject<HTMLDivElement>)?.current;
        if (!screen) return; // Allow unlock even if no water
        
        if (percentage === 0) return;

        const rect = screen.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        onPokeFish(x, y);
    };

    return (
        <div 
            ref={ref}
            onDoubleClick={handleDoubleClick}
            onPointerDown={handlePointerDown}
            className="border-4 border-[--glass] rounded bg-[--screen] aspect-[1/0.95] relative overflow-hidden my-1.5 mx-auto max-w-[calc(var(--maxw)-56px)] cursor-pointer"
        >
            <canvas ref={canvasRef} className="absolute inset-0 image-pixelated z-[2]" />
            <div 
                className="absolute left-0 right-0 bottom-0 bg-gradient-to-b from-[#59c8ff] to-[#285199] transition-all duration-700 ease-[cubic-bezier(.4,0,.2,1)] shadow-[inset_0_12px_0_rgba(255,255,255,.2)] z-[1]"
                style={{ height: `${percentage}%`, filter: waterFilterStyle() }}
            ></div>
            <svg className="absolute left-0 right-0 bottom-0 h-[60px] opacity-45 pointer-events-none z-[3]" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
                <path fill="#ffffff44" d="M0,96L48,106.7C96,117,192,139,288,149.3C384,160,480,160,576,144C672,128,768,96,864,96C960,96,1056,128,1152,133.3C1248,139,1344,117,1392,106.7L1440,96L1440,320L0,320Z"></path>
            </svg>
            <div className="absolute right-2 top-2 bg-black border-2 border-[#133972] text-white font-bold py-0.5 px-1.5 rounded-sm z-[4] text-sm">
                {Math.round(percentage)}%
            </div>
        </div>
    );
});
