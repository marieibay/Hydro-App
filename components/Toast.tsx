
import React from 'react';

interface ToastProps {
    message: string;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
    if (!message) return null;

    return (
        <div className="fixed left-1/2 top-2.5 -translate-x-1/2 bg-black border-2 border-[#0e2d66] shadow-[inset_0_0_0_2px_#0b2f6a] text-white py-2.5 px-3.5 rounded-md z-60 text-xs animate-pulse">
            {message}
        </div>
    );
};
