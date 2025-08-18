
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
        
        if (gameState.notificationPermission === 'granted' && 'serviceWorker' in navigator) {
             navigator.serviceWorker.ready.then(registration => {
                const notificationOptions = {
                    body: reminderText,
                    icon: '/icon-192x192.png',
                    vibrate: [200, 100, 200], // Add haptic feedback
                    tag: 'hydropet-reminder' // Use a tag to prevent stacking notifications
                };
                
                // Post a message to the service worker to display the notification.
                // This is the correct way to trigger notifications that work in the background.
                registration.active?.postMessage({
                    type: 'show-notification',
                    title: 'HydroPet Reminder',
                    options: notificationOptions,
                });

                if (!force) {
                    setGameState(prev => ({ ...prev, lastReminderTimestamp: Date.now() }));
                }
             }).catch(err => {
                 console.error("Error sending message to service worker:", err);
                 // Fallback to toast if service worker messaging fails
                 if (force) showToast(reminderText);
             });
        } else {
            // If permission isn't granted, or for testing, show a toast.
            showToast(reminderText);
             if (!force) {
                setGameState(prev => ({ ...prev, lastReminderTimestamp: Date.now() }));
            }
        }
    }, [gameState.notificationPermission, setGameState, showToast]);


    // 2. Set up a timer to check if a reminder is due
    useEffect(() => {
        const intervalId = setInterval(() => {
            const { settings, entries, lastReminderTimestamp, notificationPermission, ml } = gameState;
            const { reminders } = settings;
            
            // Don't remind if goal is met
            const goal = settings.useCustomGoal ? gameState.goalBase : 2000;
            if(ml >= goal) return;
            
            // Check if reminders are enabled by the user (interval > 0)
            if (reminders.intervalMin <= 0) return;

            // Check if we are within the user-defined reminder window
            const now = new Date();
            const currentHour = now.getHours();
            if (reminders.startHour <= reminders.endHour) { // Same-day window
                if (currentHour < reminders.startHour || currentHour >= reminders.endHour) return;
            } else { // Overnight window
                if (currentHour >= reminders.endHour && currentHour < reminders.startHour) return;
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

    const forceReminder = useCallback(() => {
        sendReminder(true);
    }, [sendReminder]);

    return { requestPermissionAndSaveReminders, forceReminder };
};
