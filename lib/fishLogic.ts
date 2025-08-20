
import React from 'react';
import type { GameState, Mood, FishState, Bubble, Food, Ripple, Entry } from '../types';
import { todayKey } from '../types';

// --- Mood & Vitality Calculation ---

const lastDrinkMsAgo = (entries: Entry[]): number => {
    const todaysEntries = entries.filter(e => e.ts.slice(0, 10) === todayKey() && e.amount > 0);
    if (!todaysEntries.length) return Infinity;
    const last = todaysEntries[todaysEntries.length - 1];
    return Date.now() - new Date(last.ts).getTime();
};

/**
 * Calculates the fish's vitality score.
 * A vitality boost provides an immediate override to 100% happy.
 * Otherwise, it's a weighted average of hydration recency and daily goal progress.
 */
export const calculateVitality = (state: GameState, goalToday: number): number => {
    // If a boost is active (from drinking water or a sick fish eating), vitality is 1.0.
    if (Date.now() < state.vitalityBoostUntil) {
        return 1.0;
    }

    // --- Recency Component ---
    const ms = lastDrinkMsAgo(state.entries);
    const minutesAgo = isFinite(ms) ? (ms / 60000) : 9999;
    
    const decayStartMinutes = 15;
    const totalPeriodMinutes = state.settings.cadenceMin > decayStartMinutes ? state.settings.cadenceMin : 120;
    const decayDuration = totalPeriodMinutes - decayStartMinutes;
    const rec1 = 1 - Math.min(1, Math.max(0, (minutesAgo - decayStartMinutes) / decayDuration));
    const penaltyStartMinutes = totalPeriodMinutes;
    const penaltyDuration = totalPeriodMinutes;
    const recPenalty = -0.3 * Math.min(1, Math.max(0, (minutesAgo - penaltyStartMinutes) / penaltyDuration));
    const recency = Math.max(-0.3, Math.min(1, rec1 + recPenalty));

    // --- Daily Goal Fill Component ---
    const fill = Math.min(1, state.ml / Math.max(1, goalToday));
    
    // --- Final Calculation ---
    // Recency is the most important factor for the baseline mood.
    const v = (0.80 * recency) + (0.20 * fill);
    
    return Math.max(0.05, Math.min(1, v));
};

export const getMood = (state: GameState, goalToday: number): Mood => {
    if (state.moodOverride) return state.moodOverride;
    const v = calculateVitality(state, goalToday);
    if (v > 0.8) return "happy";
    if (v > 0.55) return "ok";
    if (v > 0.3) return "sick";
    return "sos";
};


// --- Main Update Loop Logic ---
export function updateFishLogic(
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    gameScreenRef: React.RefObject<HTMLDivElement>,
    dt: number,
    moodFn: (state: GameState, goal: number) => Mood,
    goalTodayFn: () => number,
    playEat: () => void,
    playPlop: () => void
) {
    const canvas = gameScreenRef.current?.querySelector('canvas');
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) return;

    setGameState(prev => {
        const newState: GameState = JSON.parse(JSON.stringify(prev));
        const hasWater = newState.ml > 0;

        if (!hasWater) {
            return { ...newState, bubbles: [], foods: [], ripples: [] };
        }
        
        const goal = goalTodayFn();
        const waterTopPx = canvas.height * (1 - Math.min(1, newState.ml / goal));
        
        // Check if water was just added for visual/audio effects.
        if (newState.lastWaterAmount && newState.lastWaterAmount > 0) {
            playPlop();
            newState.ripples.push({
                id: Date.now() + Math.random(),
                x: canvas.width * (0.25 + Math.random() * 0.5),
                y: waterTopPx,
                radius: 1,
                life: 1,
            });
            newState.lastWaterAmount = 0; // Reset flag
        }

        const m = moodFn(newState, goal);

        // --- Ripples ---
        newState.ripples = newState.ripples.map((r: Ripple) => ({
            ...r,
            radius: r.radius + 30 * dt,
            life: r.life - 0.8 * dt,
        })).filter((r: Ripple) => r.life > 0);

        // --- Food Physics & State ---
        let newRipples: Ripple[] = [];
        const updatedFoods = newState.foods.map((food: Food) => {
            let newFood = { ...food };

            if (newFood.state === 'falling') {
                newFood.vy += 200 * dt; // Gravity in air
                if (newFood.y + newFood.vy * dt >= waterTopPx && newFood.vy > 0) {
                    newFood.y = waterTopPx;
                    newFood.vy *= -0.3; // Bounce on surface
                    newFood.vx *= 0.9;
                    if (Math.abs(newFood.vy) < 15) {
                        newFood.state = 'sinking';
                        newFood.vy = 30; // Start sinking
                    }
                    playPlop();
                    newRipples.push({ id: Date.now() + Math.random(), x: newFood.x, y: waterTopPx, radius: 1, life: 1 });
                }
            } else if (newFood.state === 'sinking') {
                newFood.vy += 20 * dt; // Gravity in water
                newFood.vy = Math.min(newFood.vy, 60); // Terminal velocity
                newFood.vx *= 0.98; // Water resistance

                if (newFood.y >= canvas.height - 5) {
                    newFood.y = canvas.height - 5;
                    newFood.vy *= -0.4; // Bounce on bottom
                    newFood.vx *= 0.8;
                    if (Math.abs(newFood.vy) < 5) {
                        newFood.state = 'settled';
                        newFood.vy = 0;
                        newFood.vx = 0;
                    }
                }
            } else if (newFood.state === 'settled') {
                newFood.life -= dt;
            }

            newFood.x += newFood.vx * dt;
            newFood.y += newFood.vy * dt;

            if (newFood.x < 5 || newFood.x > canvas.width - 5) {
                newFood.vx *= -0.7;
                newFood.x = Math.max(5, Math.min(canvas.width - 5, newFood.x));
            }
            return newFood;
        });

        if (newRipples.length > 0) {
            newState.ripples.push(...newRipples);
        }

        // --- Fish AI & Eating ---
        let fish: FishState = newState.fish;

        let closestFood: Food | null = null;
        let minFoodDist = Infinity;
        // The fish will only chase food that is sinking in the water.
        const chaseableFoods = updatedFoods.filter(f => f.state === 'sinking');

        if (chaseableFoods.length > 0) {
            for (const food of chaseableFoods) {
                const dist = Math.hypot(food.x - fish.x, food.y - fish.y);
                if (dist < minFoodDist) {
                    minFoodDist = dist;
                    closestFood = food;
                }
            }
        }

        let eatenFoodId: number | null = null;
        // If there's a food target, the fish will prioritize it.
        if (closestFood) {
            fish.target = { x: closestFood.x, y: closestFood.y, isFood: true };
            // Check if the fish is close enough to eat the food.
            if (minFoodDist < 20) {
                playEat();
                eatenFoodId = closestFood.id;
                fish.target = null; // Clear target to find a new one.
                
                const currentMood = moodFn(newState, goal);
                // Eating food provides a health boost if the fish is sick.
                if (currentMood === 'sick' || currentMood === 'sos') {
                     // Check if existing boost from water is longer, don't overwrite it with a shorter one
                    const newBoostTime = Date.now() + 120 * 1000;
                    if (newBoostTime > newState.vitalityBoostUntil) {
                        newState.vitalityBoostUntil = newBoostTime;
                    }
                }
            }
        } else if (fish.target?.isFood) {
            // The food it was chasing is gone, so find a new, non-food target.
            fish.target = null; 
        }

        newState.foods = updatedFoods.filter(f => f.life > 0 && f.id !== eatenFoodId);

        // --- Bubbles ---
        const bubbleParams = { happy: { speed: 60, count: 12 }, ok: { speed: 50, count: 12 }, sick: { speed: 36, count: 8 }, sos: { speed: 22, count: 6 } }[m];
        if (newState.bubbles.length < bubbleParams.count && performance.now() - newState.lastBubbleAt > 250) {
            newState.bubbles.push({
                x: Math.random() * canvas.width,
                y: canvas.height,
                r: 2 + Math.random() * 2,
                vy: bubbleParams.speed + Math.random() * 10,
                a: 0.9
            });
            newState.lastBubbleAt = performance.now();
        }
        newState.bubbles = newState.bubbles
            .map((b: Bubble) => ({ ...b, y: b.y - b.vy * dt }))
            .filter((b: Bubble) => b.y + b.r > waterTopPx); // Remove bubble only after its bottom has passed the surface.
        
        // ----- FISH MOVEMENT: DYNAMIC SWIMMING -----
        const pad = 30;
        const moodSpeedMap: Record<Mood, number> = { happy: 50, ok: 35, sick: 20, sos: 10 };
        
        const isChasingFood = fish.target?.isFood ?? false;
        
        // More dramatic, mood-dependent speed boost for chasing food
        const foodChaseSpeedMultiplier: Record<Mood, number> = { happy: 6.0, ok: 5.5, sick: 1.5, sos: 1.2 };
        const speedMultiplier = isChasingFood ? foodChaseSpeedMultiplier[m] : 1;

        const MAX_SPEED = moodSpeedMap[m] * speedMultiplier;
        const STEERING_FORCE = isChasingFood ? 400 : 60; // Increased for more aggressive pursuit
        const TURN_SPEED = isChasingFood ? 15 : 7; // Increased for faster turning

        // 1. Check for a target, if none or reached, find a new one.
        const targetReached = fish.target && !fish.target.isFood && Math.hypot(fish.target.x - fish.x, fish.target.y - fish.y) < 20;
        if (!fish.target || targetReached) {
            fish.target = {
                x: pad + Math.random() * (canvas.width - pad * 2),
                y: waterTopPx + pad + Math.random() * (canvas.height - waterTopPx - pad * 2),
                isFood: false
            };
        }

        // 2. Steer towards the target
        const dx = fish.target.x - fish.x;
        const dy = fish.target.y - fish.y;
        const dist = Math.hypot(dx, dy) || 1;
        
        // Calculate desired velocity
        const desiredVx = (dx / dist) * MAX_SPEED;
        const desiredVy = (dy / dist) * MAX_SPEED;

        // Calculate steering force
        const steerX = (desiredVx - fish.vx);
        const steerY = (desiredVy - fish.vy);

        // Apply steering force to velocity (acceleration)
        fish.vx += steerX * (STEERING_FORCE / MAX_SPEED) * dt;
        fish.vy += steerY * (STEERING_FORCE / MAX_SPEED) * dt;

        // 3. Apply damping/friction
        fish.vx *= 0.96;
        fish.vy *= 0.96;

        // 4. Update position
        fish.x += fish.vx * dt;
        fish.y += fish.vy * dt;

        // 5. Update visual direction (facing) based on horizontal velocity
        if (Math.abs(fish.vx) > 0.1) {
            const targetFacing = Math.sign(fish.vx);
            const facingDiff = targetFacing - fish.facing;
            if (Math.abs(facingDiff) > 0.001) {
                fish.facing += facingDiff * TURN_SPEED * dt;
            } else {
                fish.facing = targetFacing;
            }
        }
        
        // 6. BOUNDS AND VISUAL TILT
        fish.x = Math.max(pad, Math.min(canvas.width - pad, fish.x));
        fish.y = Math.max(waterTopPx + pad, Math.min(canvas.height - pad, fish.y));
        
        // The gentle up/down visual tilt based on vertical velocity.
        const speedVal = Math.hypot(fish.vx, fish.vy);
        let targetRotation = 0;
        if (speedVal > 5) {
             const clampedVy = Math.max(-100, Math.min(100, fish.vy));
             targetRotation = (clampedVy / 100) * (Math.PI / 12); // Max tilt of 15 degrees
        }

        // When facing left, the sprite is flipped, which mirrors the rotation.
        // We must pre-emptively invert the rotation to compensate.
        // This does not apply to the symmetrical front-facing view, which is not flipped.
        const isFrontView = Math.abs(fish.facing) < 0.33;
        if (fish.facing < 0 && !isFrontView) {
            targetRotation *= -1;
        }
        
        // Smoothly interpolate rotation
        fish.rotation += (targetRotation - fish.rotation) * 0.1;
        
        newState.fish = fish;
        
        return newState;
    });
}
