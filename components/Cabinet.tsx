import React from 'react';
import { GameScreen } from './GameScreen';
import { Controls } from './Controls';
import { Meter } from './Meter';
import type { GameState, Mood } from '../types';

interface CabinetProps {
    gameState: GameState;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
    goalToday: number;
    mood: Mood;
    onOpenSetup: () => void;
    onOpenDevTools: () => void;
    onAddWater: (amount: number) => void;
    onDropFood: (x: number, y: number) => void;
    onPokeFish: (x: number, y: number) => void;
    gameScreenRef: React.RefObject<HTMLDivElement>;
    unlockAudio: () => void;
    isMuted: boolean;
    onToggleMute: () => void;
}

export const Cabinet: React.FC<CabinetProps> = ({ gameState, setGameState, goalToday, mood, onOpenSetup, onOpenDevTools, onAddWater, onDropFood, onPokeFish, gameScreenRef, unlockAudio, isMuted, onToggleMute }) => {
    const { ml } = gameState;
    const percentage = Math.min(100, (ml / Math.max(1, goalToday)) * 100);

    const moodColors = {
        happy: 'text-[#78e9b6]',
        ok: 'text-[#a7c5f4]',
        sick: 'text-[#f59e0b]',
        sos: 'text-red-500'
    };

    return (
        <div className="w-full max-w-[var(--maxw)] bg-[--cabinet] p-2.5 [@media(max-height:740px)]:p-1.5 rounded-md shadow-[0_16px_40px_rgba(0,0,0,.5),_inset_0_0_0_2px_var(--border2),_inset_0_0_0_4px_#051a3a]">
            <div className="border-4 border-[--blue-dark] rounded p-2 [@media(max-height:740px)]:p-1 bg-[--panel] shadow-[inset_0_0_0_4px_var(--border)]">
                <div className="flex items-center gap-2.5 justify-center bg-[#050b18] border-4 border-[--blue-dark] rounded p-2.5 mb-2 [@media(max-height:740px)]:mb-1 shadow-[inset_0_0_0_4px_var(--border)]">
                    <div className="w-[22px] h-[28px] bg-gradient-to-b from-[#4cc9ff] to-[#1b88ff] border-4 border-[#062e6b] rounded-tl-full rounded-tr-full rounded-bl-full transform rotate-45" aria-hidden="true"></div>
                    <div className="flex flex-col items-center leading-none">
                        <div className="font-bold text-2xl tracking-[2px] text-[--white] [text-shadow:2px_2px_0_#000,_-2px_2px_0_#000,_2px_-2px_0_#000,_-2px_-2px_0_#000]">HYDROPET</div>
                    </div>
                </div>

                <GameScreen 
                    gameState={gameState}
                    percentage={percentage} 
                    mood={mood} 
                    onDropFood={onDropFood}
                    onPokeFish={onPokeFish}
                    ref={gameScreenRef}
                    unlockAudio={unlockAudio}
                />

                <div className={`mt-2.5 [@media(max-height:740px)]:mt-1.5 mb-1.5 [@media(max-height:740px)]:mb-1 max-w-[calc(var(--maxw)-56px)] mx-auto bg-black border-4 border-[--blue-dark] shadow-[inset_0_0_0_4px_var(--border2)] rounded p-2 text-center font-bold tracking-wider ${moodColors[mood]}`}>
                    MOOD: {mood.toUpperCase()}
                </div>

                <Controls onAddWater={onAddWater} />
                
                <Meter ml={ml} goal={goalToday} />

                <div className="flex justify-center items-center gap-2 mt-2.5 [@media(max-height:740px)]:mt-1.5">
                    <button 
                        id="setupBtn"
                        onClick={onOpenSetup}
                        className="flex-1 bg-black border-4 border-[--blue-dark] shadow-[inset_0_0_0_4px_var(--border2),0_6px_0_#000] text-[#ffd12b] font-bold py-3 [@media(max-height:740px)]:py-2 px-3.5 rounded-md cursor-pointer [text-shadow:0_1px_0_#000] tracking-wider active:transform active:translate-y-0.5 active:shadow-[inset_0_0_0_4px_var(--border2),0_4px_0_#000] hover:brightness-110 hover:-translate-y-px focus-visible:outline-3 focus-visible:outline-[#ffd12b] focus-visible:outline-offset-2"
                    >
                        SETUP
                    </button>
                    <button 
                        id="devBtn"
                        onClick={onOpenDevTools}
                        className="flex-1 bg-black border-4 border-[--blue-dark] shadow-[inset_0_0_0_4px_var(--border2),0_6px_0_#000] text-[#ff8a5b] font-bold py-3 [@media(max-height:740px)]:py-2 px-3.5 rounded-md cursor-pointer [text-shadow:0_1px_0_#000] tracking-wider active:transform active:translate-y-0.5 active:shadow-[inset_0_0_0_4px_var(--border2),0_4px_0_#000] hover:brightness-110 hover:-translate-y-px focus-visible:outline-3 focus-visible:outline-[#ff8a5b] focus-visible:outline-offset-2"
                    >
                        DEV
                    </button>
                    <button
                        id="audioBtn"
                        onClick={onToggleMute}
                        aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                        className="w-[58px] h-[58px] [@media(max-height:740px)]:w-[52px] [@media(max-height:740px)]:h-[52px] bg-black border-4 border-[--blue-dark] shadow-[inset_0_0_0_4px_var(--border2),0_6px_0_#000] text-[#ffd12b] font-bold rounded-md cursor-pointer [text-shadow:0_1px_0_#000] active:transform active:translate-y-0.5 active:shadow-[inset_0_0_0_4px_var(--border2),0_4px_0_#000] hover:brightness-110 hover:-translate-y-px focus-visible:outline-3 focus-visible:outline-[#ffd12b] focus-visible:outline-offset-2 flex items-center justify-center text-2xl"
                    >
                        {isMuted ? '🔇' : '🔊'}
                    </button>
                </div>

                <div className="mt-1.5 [@media(max-height:740px)]:mt-1 text-[--muted] text-xs text-center">
                    V1.0 • {new Date().toLocaleDateString()}
                </div>
            </div>
        </div>
    );
};