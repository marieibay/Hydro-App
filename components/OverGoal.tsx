
import React from 'react';

interface OverGoalProps {
    onClose: () => void;
}

export const OverGoal: React.FC<OverGoalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-[70] p-4">
            <div className="bg-[--cabinet] border-4 border-[#0e2d66] shadow-[inset_0_0_0_4px_#0b2f6a] rounded-lg p-4 text-center z-[72] w-[min(400px,90vw)]">
                <h2 className="m-0 mb-2 text-[--aqua] text-lg">WOW, DEDICATION!</h2>
                <p className="m-0 mb-3 text-[#a7c5f4] text-xs">You've surpassed your goal for today. Great job!</p>
                <button 
                    onClick={onClose}
                    className="inline-block py-2 px-3.5 bg-black border-4 border-[#0e2d66] shadow-[inset_0_0_0_4px_#0b2f6a] text-[#ffd12b] rounded-md cursor-pointer"
                >
                    KEEP GOING
                </button>
            </div>
        </div>
    );
};
