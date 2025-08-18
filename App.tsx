
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Cabinet } from './components/Cabinet';
import { SetupPanel } from './components/SetupPanel';
import { Celebration } from './components/Celebration';
import { OverGoal } from './components/OverGoal';
import { Toast } from './components/Toast';
import { useAudio } from './hooks/useAudio';
import { useReminders } from './hooks/useReminders';
import { GameState, initialSettings, Settings } from './types';
import { updateFishLogic, getMood } from './lib/fishLogic';
import { vibrate } from './lib/haptics';

const STORAGE_KEY = "hydropet_react_v1.0"; // Bump version for new state

/**
 * Determines the current "day" key based on the user's shift settings.
 * This allows for daily rollovers that aren't tied to midnight UTC.
 */
const getCurrentShiftKey = (settings: Settings): string => {
    const now = new Date();
    const { shiftMode, customWindow } = settings;

    let resetHour = 0; // Midnight for 'day' shift
    let resetMinute = 0;

    if (shiftMode === 'night') {
        resetHour = 12; // Noon
    } else if (shiftMode === 'custom') {
        const [endHour, endMinute] = customWindow.end.split(':').map(Number);
        const resetTime = new Date();
        resetTime.setHours(endHour, endMinute, 0, 0);
        resetTime.setHours(resetTime.getHours() + 2); // Reset is 2 hours after the defined end time
        resetHour = resetTime.getHours();
        resetMinute = resetTime.getMinutes();
    }

    const todayResetTime = new Date();
    todayResetTime.setHours(resetHour, resetMinute, 0, 0);

    const dateForState = new Date(now);
    if (now < todayResetTime) {
        // If we are before today's calculated reset time, we are still on "yesterday's" shift.
        dateForState.setDate(dateForState.getDate() - 1);
    }
    
    return dateForState.toISOString().slice(0, 10);
};


const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Migrations for new properties
                if (!parsed.settings) parsed.settings = initialSettings;
                if (typeof parsed.celebratedToday === 'undefined') parsed.celebratedToday = false;
                if (!parsed.fish.rotation) parsed.fish.rotation = 0;
                if (typeof parsed.postGoalHydrations === 'undefined') parsed.postGoalHydrations = 0;
                if (!parsed.fish.state || parsed.fish.state === 'patrolling') {
                    parsed.fish.state = 'swimming';
                    delete parsed.fish.patrolDirection;
                    parsed.fish.target = null;
                }
                if (!parsed.foods) parsed.foods = [];
                if (!parsed.ripples) parsed.ripples = [];
                if (parsed.fish.target && typeof parsed.fish.target.isFood !== 'undefined') {
                    parsed.fish.target = null; // Clear old food targets on load
                }
                if (typeof parsed.lastWaterAmount === 'undefined') parsed.lastWaterAmount = 0;
                if (typeof parsed.vitalityBoostUntil === 'undefined') parsed.vitalityBoostUntil = 0;
                if (typeof parsed.notificationPermission === 'undefined') parsed.notificationPermission = 'default';
                if (typeof parsed.lastReminderTimestamp === 'undefined') parsed.lastReminderTimestamp = 0;
                if (typeof parsed.goalRecommendation === 'undefined') parsed.goalRecommendation = null;


                // Ensure removed properties are gone
                delete parsed.mouthBubs;
                
                // On load, check if a rollover is needed immediately
                const currentKey = getCurrentShiftKey(parsed.settings);
                if (parsed.date !== currentKey) {
                    parsed.date = currentKey;
                    parsed.ml = 0;
                    parsed.celebratedToday = false;
                    parsed.postGoalHydrations = 0;
                }

                return parsed;
            }
        } catch (e) {
            console.error("Failed to load state from localStorage", e);
        }
        return {
            date: getCurrentShiftKey(initialSettings),
            goalBase: 2000,
            ml: 0,
            entries: [],
            settings: initialSettings,
            celebratedToday: false,
            postGoalHydrations: 0,
            fish: { x: 150, y: 150, vx: 0, vy: 0, target: null, facing: 1, phase: Math.random() * Math.PI * 2, rotation: 0, state: 'swimming' },
            bubbles: [],
            foods: [],
            ripples: [],
            lastBubbleAt: 0,
            moodOverride: null,
            vitalityBoostUntil: 0,
            followTarget: null,
            followTimeoutId: null,
            lastWaterAmount: 0,
            notificationPermission: 'default',
            lastReminderTimestamp: 0,
            goalRecommendation: null,
        };
    });

    const [isSetupOpen, setSetupOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [isCelebrating, setCelebrating] = useState(false);
    const [isOverhydrated, setOverhydrated] = useState(false);
    
    const { playGulp, playCelebrate, playEat, playToast, unlockAudio, AudioGate, playOverGoal, playPlop, playPoke } = useAudio();
    
    const showToast = useCallback((msg: string) => {
        playToast();
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    }, [playToast]);

    const { requestPermissionAndSaveReminders, forceReminder } = useReminders(gameState, setGameState, showToast);

    const lastTimeRef = useRef(performance.now());
    const gameScreenRef = useRef<HTMLDivElement>(null);

    // Save state to localStorage
    useEffect(() => {
        try {
            const stateToSave = { ...gameState };
            // Don't save transient state
            delete stateToSave.followTimeoutId;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
            console.error("Failed to save state to localStorage", e);
        }
    }, [gameState]);

    // Daily rollover using shift-aware logic
    useEffect(() => {
        const checkRollover = () => {
            const currentKey = getCurrentShiftKey(gameState.settings);
            if (gameState.date !== currentKey) {
                console.log(`Rollover triggered: from ${gameState.date} to ${currentKey}`);
                setGameState(prev => ({
                    ...prev,
                    date: currentKey,
                    ml: 0,
                    // Entries are preserved for historical stats
                    celebratedToday: false,
                    postGoalHydrations: 0
                }));
            }
        };

        // Check immediately and then set up an interval to check periodically
        checkRollover();
        const intervalId = setInterval(checkRollover, 60 * 1000); // Check every minute

        return () => clearInterval(intervalId);
    }, [gameState.date, gameState.settings]);
    
    const goalToday = useCallback(() => {
        return gameState.settings.useCustomGoal ? gameState.goalBase : 2000;
    }, [gameState.settings.useCustomGoal, gameState.goalBase]);

    const currentMood = getMood(gameState, goalToday());

    // Game Loop
    useEffect(() => {
        let animationFrameId: number;
        
        const loop = (timestamp: number) => {
            const dt = Math.min(0.033, (timestamp - lastTimeRef.current) / 1000);
            lastTimeRef.current = timestamp;
            
            updateFishLogic(setGameState, gameScreenRef, dt, getMood, goalToday, playEat, playPlop);
            
            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [goalToday, playEat, playPlop, setGameState]);

    // Check for goal achievement
    useEffect(() => {
        if (gameState.ml >= goalToday() && !gameState.celebratedToday) {
            setCelebrating(true);
            playCelebrate();
            setGameState(prev => ({ ...prev, celebratedToday: true }));
        }
    }, [gameState.ml, gameState.celebratedToday, goalToday, playCelebrate]);

    const handleAddWater = (amount: number) => {
        vibrate(50);
        unlockAudio();
        playGulp();

        if (gameState.celebratedToday && amount > 0) {
            const newCount = gameState.postGoalHydrations + 1;
            // Show on the 1st time, then every 5th time after that (e.g. 1, 6, 11)
            if (newCount === 1 || (newCount > 1 && (newCount - 1) % 5 === 0)) {
                setOverhydrated(true);
                playOverGoal();
            }
        }
    
        setGameState(prev => {
            const newPostGoalHydrations = (prev.celebratedToday && amount > 0) 
                ? prev.postGoalHydrations + 1 
                : prev.postGoalHydrations;
            
            return {
                ...prev,
                ml: Math.max(0, prev.ml + amount),
                entries: [...prev.entries, { ts: new Date().toISOString(), amount }],
                postGoalHydrations: newPostGoalHydrations,
                lastWaterAmount: amount, // Flag for game loop to apply ripple effect
                moodOverride: null, // Clear any dev-tool mood override
                vitalityBoostUntil: Date.now() + 90 * 1000, // Apply a 90-second mood boost
            };
        });
    };
    
    const handleDropFood = (x: number, y: number) => {
        const foodColors = ['#a0522d', '#cd853f', '#d2691e']; // Sienna, Peru, Chocolate
        const now = Date.now();
        setGameState(prev => {
            if (prev.foods.length >= 15) {
                showToast("The tank is full of food!");
                return prev;
            }

            const newFoods = Array.from({ length: 3 }).map((_, i) => ({
                id: now + i,
                x: x + (Math.random() - 0.5) * 20, // Spread them out
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 30,
                vy: (Math.random() - 0.5) * 20, // Give some initial vertical velocity to scatter
                state: 'falling' as const,
                life: 10,
                color: foodColors[Math.floor(Math.random() * foodColors.length)]
            }));

            return {
                ...prev,
                foods: [...prev.foods, ...newFoods],
            }
        });
    };

    const handlePokeFish = (x: number, y: number) => {
        const fish = gameState.fish;
        const dist = Math.hypot(x - fish.x, y - fish.y);
        const pokeRadius = 40; // Approx radius of the fish

        if (dist < pokeRadius) {
            vibrate([10, 50, 10]);
            playPoke();
            setGameState(prev => {
                const angle = Math.atan2(fish.y - y, fish.x - x);
                const jumpForce = 200;
                return {
                    ...prev,
                    fish: {
                        ...prev.fish,
                        vx: prev.fish.vx + Math.cos(angle) * jumpForce,
                        vy: prev.fish.vy + Math.sin(angle) * jumpForce,
                        target: null, // fish should find a new target after being poked
                    },
                    ripples: [
                        ...prev.ripples,
                        { id: Date.now(), x: fish.x, y: fish.y, radius: 1, life: 0.8 }
                    ]
                }
            });
        }
    };

    return (
        <div className="stage font-press-start flex justify-center w-full">
            <main>
                <Cabinet
                    gameState={gameState}
                    setGameState={setGameState}
                    goalToday={goalToday()}
                    mood={currentMood}
                    onOpenSetup={() => setSetupOpen(true)}
                    onAddWater={handleAddWater}
                    onDropFood={handleDropFood}
                    onPokeFish={handlePokeFish}
                    gameScreenRef={gameScreenRef}
                    unlockAudio={unlockAudio}
                />
            </main>
            {isSetupOpen && (
                <SetupPanel
                    onClose={() => setSetupOpen(false)}
                    gameState={gameState}
                    setGameState={setGameState}
                    showToast={showToast}
                    onSaveReminders={requestPermissionAndSaveReminders}
                    onForceReminder={forceReminder}
                    playGulp={playGulp}
                    playCelebrate={playCelebrate}
                    playEat={playEat}
                />
            )}
            {isCelebrating && <Celebration onClose={() => setCelebrating(false)} />}
            {isOverhydrated && <OverGoal onClose={() => setOverhydrated(false)} />}
            <Toast message={toastMessage} />
            <AudioGate />
        </div>
    );
};

export default App;
