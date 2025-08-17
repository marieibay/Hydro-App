
import React from 'react';

interface ControlsProps {
    onAddWater: (amount: number) => void;
}

const GlassButton: React.FC<{ amount: number; waterHeight: string; onClick: () => void; }> = ({ amount, waterHeight, onClick }) => (
    <div 
        className="cursor-pointer bg-black border-4 border-[--blue-dark] shadow-[inset_0_0_0_4px_var(--border2),0_6px_0_#000] p-2 text-center rounded flex flex-col items-center gap-1.5 transition-transform active:translate-y-0.5 active:shadow-[inset_0_0_0_4px_var(--border2),0_4px_0_#000]"
        onClick={onClick}
    >
        <div className="w-6 h-8 relative bg-[#1a3454] border-2 border-[#4a90e2] rounded-b border-t-0 shadow-[inset_0_2px_0_rgba(255,255,255,0.2)]">
            <div 
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#59c8ff] to-[#3b86d7] rounded-b-sm transition-all duration-300"
                style={{ height: waterHeight }}
            ></div>
        </div>
        <div className="text-[#ffd12b] font-bold text-[10px] tracking-wider">{amount}ML</div>
    </div>
);

export const Controls: React.FC<ControlsProps> = ({ onAddWater }) => {
    return (
        <div className="grid grid-cols-3 gap-2.5 max-w-[calc(var(--maxw)-56px)] mx-auto my-2">
            <GlassButton amount={100} waterHeight="33%" onClick={() => onAddWater(100)} />
            <GlassButton amount={200} waterHeight="66%" onClick={() => onAddWater(200)} />
            <GlassButton amount={300} waterHeight="100%" onClick={() => onAddWater(300)} />
        </div>
    );
};
