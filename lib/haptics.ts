/**
 * Triggers haptic feedback if the browser supports it.
 * @param pattern - A number or an array of numbers representing the vibration pattern.
 * e.g., 50 for a 50ms vibration, [100, 50, 100] for vibrate, pause, vibrate.
 */
export const vibrate = (pattern: number | number[]): void => {
    if ('vibrate' in navigator) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            // This can happen if the user has disabled vibrations or in certain browser modes.
            console.warn("Haptic feedback failed.", e);
        }
    }
};
