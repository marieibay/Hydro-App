
import { useState, useEffect, useMemo } from 'react';
import type { Mood } from '../types';

export interface Sprite {
    img: HTMLImageElement | null;
    fw: number;
    fh: number;
    isReady: boolean;
}

const makeSprite = (): { img: HTMLImageElement, fw: number, fh: number } => {
    const fw = 32, fh = 32, cols = 3, rows = 4; // 3 columns for 3D views
    const off = document.createElement('canvas');
    off.width = fw * cols;
    off.height = fh * rows;
    const p = off.getContext('2d');
    if (!p) throw new Error("Could not create 2d context for sprite");
    p.imageSmoothingEnabled = false;

    function rect(x0: number, y0: number, x1: number, y1: number, c: string, px: number, py: number) {
        p.fillStyle = c;
        p.fillRect(px + x0, py + y0, (x1 - x0 + 1), (y1 - y0 + 1));
    }
    function dot(x: number, y: number, c: string, px: number, py: number) {
        rect(x, y, x, y, c, px, py);
    }

    function drawFish(px: number, py: number, mood: Mood, view: 'side' | 'three_quarter' | 'front') {
        let blue = '#3c5a91', blue_dark = '#2c4a71',
            orange = '#ed6321', orange_dark = '#b3511d', orange_light = '#ff8840',
            white = '#f5f5f5', white_shadow = '#dcdcdc',
            eyeW = '#fafafa', eyeB = '#0f0f14', eye_highlight = '#ffffff';

        if (mood === 'sick') {
            blue = '#3a4e7a'; blue_dark = '#2a3e6a';
            orange = '#c75a1f'; orange_dark = '#a54b19'; orange_light = '#e57a3b'; white = '#e8f1f1'; white_shadow = '#c1c8c8'; eyeW = '#e8f1f1';
        }
        if (mood === 'sos') {
            blue = '#543c53'; blue_dark = '#442c43';
            orange = '#b33c2b'; orange_dark = '#923123'; orange_light = '#d45b48'; white = '#f0dede'; white_shadow = '#c4b8b8'; eyeW = '#f0dede';
        }
        
        const dx = (mood === 'happy') ? 1 : (mood === 'ok') ? 0 : -1;
        const dy = (mood === 'happy' || mood === 'ok' || mood === 'sick') ? 1 : 0;

        if (view === 'side') {
            // Body and fins
            rect(8, 13, 22, 18, orange, px, py); rect(9, 11, 21, 12, orange_light, px, py); dot(22, 12, orange_light, px, py); rect(9, 19, 21, 19, orange_dark, px, py); dot(8, 18, orange_dark, px, py); dot(22, 18, orange_dark, px, py);
            
            // Stripes with black outline
            rect(11, 11, 11, 18, white, px, py); // Center white line (1px wide)
            rect(10, 11, 10, 18, eyeB, px, py);  // Left black edge
            rect(12, 11, 12, 18, eyeB, px, py);  // Right black edge
            rect(10, 19, 12, 20, white_shadow, px, py); // Shadow underneath

            rect(17, 11, 17, 18, white, px, py); // Center white line (1px wide)
            rect(16, 11, 16, 18, eyeB, px, py);  // Left black edge
            rect(18, 11, 18, 18, eyeB, px, py);  // Right black edge
            rect(16, 19, 18, 20, white_shadow, px, py); // Shadow underneath

            // Tail fin
            rect(4, 14, 6, 17, orange, px, py); dot(4, 13, orange_light, px, py); dot(4, 18, orange_dark, px, py);
            
            // Outline
            dot(8, 10, blue, px, py); dot(10, 10, blue, px, py); dot(16, 10, blue, px, py); dot(19, 10, blue, px, py);
            rect(3, 13, 4, 18, blue_dark, px, py);
            dot(7, 20, blue_dark, px, py); dot(9, 21, blue_dark, px, py); dot(18, 21, blue_dark, px, py);
            
            // Eye
            rect(21, 13, 23, 15, eyeW, px, py); dot(22 + dx, 14 + dy, eyeB, px, py); dot(21, 13, eye_highlight, px, py);
            // Removed mouth expression dots as per user request
            // if (mood === 'happy') { dot(24, 18, eyeB, px, py); dot(23, 17, eyeB, px, py); } else if (mood === 'ok') { dot(23, 18, eyeB, px, py); } else if (mood === 'sick') { dot(22, 19, eyeB, px, py); } else { dot(24, 17, eyeB, px, py); }
            
            // Top/Bottom fins
            rect(12, 9, 14, 10, orange_light, px, py); rect(12, 21, 14, 22, orange_dark, px, py);

        } else if (view === 'three_quarter') {
            rect(10, 13, 20, 18, orange, px, py); rect(11, 11, 19, 12, orange_light, px, py); rect(11, 19, 19, 19, orange_dark, px, py);

            // Stripes with black outline
            rect(13, 11, 13, 18, white, px, py); // White part (1px)
            rect(12, 11, 12, 18, eyeB, px, py);  // Black edge
            rect(12, 19, 13, 20, white_shadow, px, py);

            rect(17, 11, 17, 18, white, px, py); // White part (1px)
            rect(16, 11, 16, 18, eyeB, px, py);  // Black edge
            rect(16, 19, 17, 20, white_shadow, px, py);

            rect(8, 14, 9, 17, orange, px, py); dot(8, 13, orange_light, px, py); dot(8, 18, orange_dark, px, py);
            
            // Outline
            dot(10, 10, blue, px, py); dot(16, 10, blue, px, py);
            rect(7, 13, 8, 18, blue_dark, px, py);
            dot(9, 20, blue_dark, px, py); dot(11, 21, blue_dark, px, py); dot(17, 21, blue_dark, px, py);
            
            // Eye
            rect(19, 13, 21, 15, eyeW, px, py); dot(20 + dx, 14 + dy, eyeB, px, py); dot(19, 13, eye_highlight, px, py);
            // Removed mouth expression dots as per user request
            // if (mood === 'happy') { dot(22, 18, eyeB, px, py); dot(21, 17, eyeB, px, py); } else if (mood === 'ok') { dot(21, 18, eyeB, px, py); } else if (mood === 'sick') { dot(20, 19, eyeB, px, py); } else { dot(22, 17, eyeB, px, py); }
            
            // Top/Bottom fins
            rect(13, 9, 14, 10, orange_light, px, py); rect(13, 21, 14, 22, orange_dark, px, py);
        } else if (view === 'front') {
            rect(14, 11, 17, 20, orange, px, py); rect(13, 12, 13, 19, orange, px, py); rect(18, 12, 18, 19, orange, px, py);
            rect(14, 11, 17, 11, orange_light, px, py); rect(14, 20, 17, 20, orange_dark, px, py);
            rect(14, 11, 17, 12, white, px, py); rect(14, 18, 17, 19, white, px, py); rect(14, 19, 17, 20, white_shadow, px, py);
            rect(14, 10, 17, 10, blue, px, py); rect(14, 21, 17, 21, blue_dark, px, py);
            dot(13, 11, blue, px, py); dot(12, 12, blue, px, py); dot(12, 19, blue, px, py); dot(13, 20, blue_dark, px, py);
            dot(18, 11, blue, px, py); dot(19, 12, blue, px, py); dot(19, 19, blue, px, py); dot(18, 20, blue_dark, px, py);
            rect(12, 13, 13, 15, eyeW, px, py); rect(18, 13, 19, 15, eyeW, px, py);
            const pupilY = (mood === 'sick' || mood === 'sos') ? 14 : 15;
            dot(13, pupilY, eyeB, px, py); dot(18, pupilY, eyeB, px, py);
            dot(12, 13, eye_highlight, px, py); dot(18, 13, eye_highlight, px, py);
            rect(10, 15, 11, 16, orange_light, px, py); rect(20, 15, 21, 16, orange_light, px, py);
            if (mood === 'happy') { rect(15, 19, 16, 19, eyeB, px, py); } else if (mood === 'ok') { rect(15, 19, 16, 19, eyeB, px, py); dot(15,18,eyeB,px,py); dot(16,18,eyeB,px,py); }
        }
    }
    
    const moods: Mood[] = ['sos', 'sick', 'ok', 'happy'];
    const views: ('side' | 'three_quarter' | 'front')[] = ['side', 'three_quarter', 'front'];
    
    for (let r = 0; r < moods.length; r++) {
        for (let c = 0; c < views.length; c++) {
            drawFish(c * fw, r * fh, moods[r], views[c]);
        }
    }
    
    const img = new Image();
    img.src = off.toDataURL('image/png');
    return { img, fw, fh };
};


export const useFishSprite = (mood: Mood): Sprite => {
    const spriteData = useMemo(() => makeSprite(), []);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (spriteData.img.complete) {
            setIsReady(true);
        } else {
            spriteData.img.onload = () => setIsReady(true);
        }
    }, [spriteData.img]);

    return { ...spriteData, isReady };
};
