
import { useEffect, useCallback } from 'react';
import type { GameState, ReminderSettings, Entry } from '../types';
import { todayKey } from '../types';

const lastDrinkMsAgo = (entries: Entry[]): number => {
    const todaysEntries = entries.filter(e => e.ts.slice(0, 10) === todayKey() && e.amount > 0);
    if (!todaysEntries.length) return Infinity;
    const last = todaysEntries[todaysEntries.length - 1];
    return Date.now() - new Date(last.ts).getTime();
};

/**
 * Converts a VAPID public key string to a Uint8Array.
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const useReminders = (
    gameState: GameState,
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    showToast: (message: string) => void
) => {

    const sendReminder = useCallback((force = false) => {
        const reminderText = "Time for some water!";
        
        if (gameState.notificationPermission === 'granted' && 'serviceWorker' in navigator) {
             navigator.serviceWorker.ready.then(registration => {
                if (!registration.active) {
                    // Service worker is not active, fall back to a toast
                    console.warn("Service worker not active, falling back to toast for reminder.");
                    showToast(reminderText); // Show toast as fallback
                    if (!force) {
                        setGameState(prev => ({ ...prev, lastReminderTimestamp: Date.now() }));
                    }
                    return;
                }

                const notificationOptions = {
                    body: reminderText,
                    icon: '/icon-192x192.png',
                    vibrate: [200, 100, 200], // Add haptic feedback
                    tag: 'hydropet-reminder' // Use a tag to prevent stacking notifications
                };
                
                registration.active.postMessage({
                    type: 'show-notification',
                    title: 'HydroPet Reminder',
                    options: notificationOptions,
                });

                if (!force) {
                    setGameState(prev => ({ ...prev, lastReminderTimestamp: Date.now() }));
                }
             }).catch(err => {
                 console.error("Error sending message to service worker:", err);
                 // Fallback to toast if service worker messaging fails for any other reason
                 showToast(reminderText);
                 if (!force) {
                    setGameState(prev => ({ ...prev, lastReminderTimestamp: Date.now() }));
                 }
             });
        } else {
            // If permission isn't granted, or for testing, show a toast.
            showToast(reminderText);
             if (!force) {
                setGameState(prev => ({ ...prev, lastReminderTimestamp: Date.now() }));
            }
        }
    }, [gameState.notificationPermission, setGameState, showToast]);


    // 2. Set up a timer to check if a reminder is due.
    // This client-side timer provides smart reminders (based on last drink time) when the app is open.
    // The server-side cron job provides fallback reminders when the app is closed.
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
            // This will be a local notification if granted, or an in-app toast otherwise.
            sendReminder(false);

        }, 30000); // Check every 30 seconds

        return () => clearInterval(intervalId);
    }, [gameState, setGameState, sendReminder, showToast]);


    const requestPermissionAndSaveReminders = useCallback(async (newReminderSettings: ReminderSettings) => {
        let currentPermission = gameState.notificationPermission;

        // Only request permission if it's the default state. Don't re-prompt if it's already denied or granted.
        if (currentPermission === 'default' && 'Notification' in window) {
            try {
                currentPermission = await Notification.requestPermission();
            } catch (error) {
                console.error("Error requesting notification permission:", error);
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
            
            // Subscribe to the Push Service for server-side notifications
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                navigator.serviceWorker.ready.then(registration => {
                    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;

                    if (!vapidPublicKey) {
                        console.error("VAPID public key not found in environment variables.");
                        showToast("Push notifications not configured.");
                        return;
                    }

                    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

                    registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: convertedVapidKey
                    }).then(subscription => {
                        console.log('User is subscribed:', subscription);
                        
                        // Send the subscription object to our backend API
                        fetch('/api/save-subscription', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(subscription)
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Failed to save subscription on server.');
                            }
                            console.log('Subscription saved on server.');
                        })
                        .catch(err => {
                            console.error('Error sending subscription to server: ', err);
                            showToast('Could not save reminder preference.');
                        });

                    }).catch(err => {
                        console.error('Failed to subscribe the user: ', err);
                        showToast('Push subscription failed.');
                    });
                });
            }

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