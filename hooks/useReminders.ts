
import { useEffect, useCallback } from 'react';
import type { GameState, ReminderSettings, Entry } from '../types';
import { todayKey } from '../types';

const lastDrinkMsAgo = (entries: Entry[]): number => {
    const todaysEntries = entries.filter(e => e.ts.slice(0, 10) === todayKey() && e.amount > 0);
    if (!todaysEntries.length) return Infinity;
    const last = todaysEntries[todaysEntries.length - 1];
    return Date.now() - new Date(last.ts).getTime();
};

export const useReminders = (
    gameState: GameState,
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    showToast: (message: string) => void
) => {

    // 1. Register the standard service worker file
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
                })
                .catch(err => {
                    console.error('Service Worker registration failed:', err);
                });
        }
    }, []);

    const sendReminder = useCallback((force = false) => {
        const reminderText = "Time for some water!";
        
        if (gameState.notificationPermission === 'granted') {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification('HydroPet Reminder', {
                    body: reminderText,
                    // You would add icon paths here, e.g., icon: '/icon-192x192.png'
                });
                if (!force) {
                    setGameState(prev => ({ ...prev, lastReminderTimestamp: Date.now() }));
                }
            }).catch(err => console.error("Error showing notification:", err));
        } else if (force) {
            // If forcing a reminder for testing and perms aren't granted, show a toast.
            showToast(reminderText);
        }
    }, [gameState.notificationPermission, setGameState, showToast]);


    // 2. Set up a timer to check if a reminder is due
    useEffect(() => {
        const intervalId = setInterval(() => {
            const { settings, entries, lastReminderTimestamp, notificationPermission } = gameState;
            const { reminders } = settings;
            
            // Check if reminders are enabled by the user (interval > 0)
            if (reminders.intervalMin <= 0) return;

            // Check if we are within the user-defined reminder window
            const now = new Date();
            const currentHour = now.getHours();
            if (currentHour < reminders.startHour || currentHour >= reminders.endHour) {
                return;
            }

            // Check if enough time has passed since the last drink
            const msSinceLastDrink = lastDrinkMsAgo(entries);
            if (msSinceLastDrink < reminders.intervalMin * 60 * 1000) {
                return;
            }

            // Check if enough time has passed since the last reminder to avoid spam
            const msSinceLastReminder = Date.now() - lastReminderTimestamp;
            if (msSinceLastReminder < reminders.intervalMin * 60 * 1000) {
                return;
            }
            
            // If all checks pass, send a reminder
            if (notificationPermission === 'granted') {
                 sendReminder(false);
            } else { // Fallback to in-app toast if permission not granted
                 showToast("Time for some water!");
                 setGameState(prev => ({ ...prev, lastReminderTimestamp: Date.now() }));
            }

        }, 30000); // Check every 30 seconds

        return () => clearInterval(intervalId);
    }, [gameState, setGameState, sendReminder, showToast]);


    const requestPermissionAndSaveReminders = useCallback(async (newReminderSettings: ReminderSettings) => {
        let currentPermission = gameState.notificationPermission;

        // Only request permission if it's the default state. Don't re-prompt if it's already denied or granted.
        if (currentPermission === 'default') {
            try {
                currentPermission = await Notification.requestPermission();
            } catch (error) {
                console.error("Error requesting notification permission:", error);
                // If there's an error, it's likely the user dismissed it, so treat as default for now.
                currentPermission = 'default';
            }
        }

        setGameState(prev => ({
            ...prev,
            notificationPermission: currentPermission,
            settings: {
                ...prev.settings,
                reminders: newReminderSettings
            }
        }));

        if (currentPermission === 'granted') {
            showToast('Reminders saved and notifications enabled!');
        } else if (currentPermission === 'denied') {
            showToast('Notifications blocked. Reminders will show in-app only.');
        } else {
            showToast('Reminder settings saved.');
        }

    }, [gameState.notificationPermission, setGameState, showToast]);

    return { requestPermissionAndSaveReminders };
};
