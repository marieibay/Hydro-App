
import React from 'react';
import type { GameState, Mood } from '../types';

interface DevToolsProps {
    onClose: () => void;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
    onTestReminder: () => void;
    onForceReminder: () => void;
    playGulp: () => void;
    playCelebrate: () => void;
    playEat: () => void;
}

const PxButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
    <button 
        className="text-xs p-2 cursor-pointer bg-black border-4 border-[--blue-dark] shadow-[inset_0_0_0_4px_var(--border2),_0_6px_0_#000] text-[#ffd12b] font-bold text-center rounded active:translate-y-0.5"
        onClick={onClick}
    >
        {children}
    </button>
);

export const DevTools: React.FC<DevToolsProps> = ({ onClose, setGameState, onTestReminder, onForceReminder, playGulp, playCelebrate, playEat }) => {
    
    const handleAction = (actionFn: () => void) => {
        actionFn();
        onClose();
    };

    const handleReset = () => {
        setGameState(prev => ({
            ...prev,
            ml: 0,
            entries: [],
            celebratedToday: false,
            moodOverride: null,
            bubbles: []
        }));
    };

    const handleUndo = () => {
        setGameState(prev => {
            if (prev.entries.length === 0) return prev;
            const lastEntry = prev.entries[prev.entries.length - 1];
            return {
                ...prev,
                ml: Math.max(0, prev.ml - lastEntry.amount),
                entries: prev.entries.slice(0, -1),
                celebratedToday: false,
            };
        });
    };
    
    const handleNextMood = () => {
        setGameState(prev => {
            const moods: (Mood | null)[] = ['happy', 'ok', 'sick', 'sos', null];
            const currentIndex = moods.indexOf(prev.moodOverride);
            const nextIndex = (currentIndex + 1) % moods.length;
            return { ...prev, moodOverride: moods[nextIndex] };
        });
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-50 p-4">
            <div className="w-[min(400px,95vw)] bg-[--cabinet] border-4 border-[--blue-dark] shadow-[inset_0_0_0_4px_var(--border2)] rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="m-0 text-xs text-[#ff8a5b] tracking-wider">DEV • TEST</h3>
                    <button className="py-1 px-2 text-xs bg-[#061021] text-[#a7c5f4] border-2 border-[--blue-dark] rounded-sm" onClick={onClose}>CLOSE</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <PxButton onClick={() => handleAction(handleUndo)}>UNDO</PxButton>
                    <PxButton onClick={() => handleAction(handleReset)}>RESET TODAY</PxButton>
                    <PxButton onClick={() => handleAction(onTestReminder)}>TEST TOAST</PxButton>
                    <PxButton onClick={() => handleAction(onForceReminder)}>FORCE REMINDER</PxButton>
                    <PxButton onClick={() => handleAction(handleNextMood)}>NEXT MOOD</PxButton>
                    <PxButton onClick={() => handleAction(playGulp)}>AUDIO: GULP</PxButton>
                    <PxButton onClick={() => handleAction(playCelebrate)}>AUDIO: CELEBRATE</PxButton>
                    <PxButton onClick={() => handleAction(playEat)}>AUDIO: EAT</PxButton>
                </div>
                <div className="text-[--muted] text-[11px] mt-2">Tests: A-OK</div>
            </div>
        </div>
    );
};
