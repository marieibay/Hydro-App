import React from 'react';

interface MeterProps {
    ml: number;
    goal: number;
}

export const Meter: React.FC<MeterProps> = ({ ml, goal }) => {
    const percentage = Math.min(100, (ml / Math.max(1, goal)) * 100);

    return (
        <div className="max-w-[calc(var(--maxw)-56px)] mx-auto my-2 [@media(max-height:740px)]:my-1 border-4 border-[--blue-dark] shadow-[inset_0_0_0_4px_var(--border2)] bg-[#062449] rounded p-2">
            <div className="flex justify-center gap-2 font-bold text-white mb-1.5">
                <span>{Math.round(ml)}</span>
                <span>/</span>
                <span>{goal}</span>
                <span>ML</span>
            </div>
            <div className="h-3.5 border-2 border-black bg-[#091a30] shadow-[inset_0_0_0_3px_#0b2f6a] rounded-sm overflow-hidden">
                <div 
                    className="h-full bg-[--orange] transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};