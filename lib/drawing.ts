
import type { FishState, Mood, Bubble, Food, Ripple } from '../types';
import type { Sprite } from '../hooks/useFishSprite';

export function drawPixelClown(ctx: CanvasRenderingContext2D, fish: FishState, mood: Mood, sprite: Sprite, canvas: HTMLCanvasElement) {
    if (!sprite.isReady || !sprite.img) return;

    const rowMap: Record<Mood, number> = { sos: 0, sick: 1, ok: 2, happy: 3 };
    const row = rowMap[mood] ?? 3;
    
    // Determine column based on facing direction for 3D effect
    const absFacing = Math.abs(fish.facing);
    let col = 0;
    if (absFacing < 0.33) {
        col = 2; // Front view
    } else if (absFacing < 0.8) {
        col = 1; // 3/4 view
    } else {
        col = 0; // Side view
    }

    // Determine flip for non-symmetrical views
    const flip = fish.facing < 0;
    
    const desired = Math.min(240, Math.max(140, canvas.width * 0.42));
    const scale = desired / sprite.fw;

    const ampMap: Record<Mood, number> = { happy: 1.5, ok: 1.0, sick: 0.6, sos: 0.2 };
    const amp = ampMap[mood] ?? 1.0;
    const bob = Math.sin((performance.now() * 0.001) + fish.phase) * amp;

    ctx.save();
    ctx.translate(fish.x, fish.y + bob);
    
    ctx.rotate(fish.rotation);
    
    // The front view (col 2) is symmetrical, so we don't flip it.
    // For other views, flip based on the sign of `facing`.
    if (flip && col !== 2) {
        ctx.scale(-1, 1);
    }
    
    ctx.scale(scale, scale);
    
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite.img, col * sprite.fw, row * sprite.fh, sprite.fw, sprite.fh, -sprite.fw / 2, -sprite.fh / 2, sprite.fw, sprite.fh);
    ctx.restore();
}

export function drawBubbles(ctx: CanvasRenderingContext2D, bubbles: Bubble[], canvas: HTMLCanvasElement, waterPercentage: number) {
    const waterTopPx = canvas.height * (1 - waterPercentage / 100);
    ctx.save();
    for (const b of bubbles) {
        // This check is redundant with the filter in fishLogic and can cause bubbles to disappear a frame early.
        // if (b.y <= waterTopPx) continue; 
        ctx.globalAlpha = b.a;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = '#bfe6ff';
        ctx.fill();
    }
    ctx.restore();
}

export function drawFood(ctx: CanvasRenderingContext2D, foods: Food[]) {
    ctx.save();
    for (const food of foods) {
        ctx.globalAlpha = Math.min(1, food.life / 2); // Fade out at the end
        ctx.fillStyle = food.color;
        ctx.beginPath();
        ctx.arc(food.x, food.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

export function drawRipples(ctx: CanvasRenderingContext2D, ripples: Ripple[]) {
    ctx.save();
    for (const ripple of ripples) {
        ctx.globalAlpha = ripple.life;
        ctx.strokeStyle = `rgba(191, 230, 255, ${ripple.life})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}