
import { kv } from '@vercel/kv';
import webpush from 'web-push';

// This function is triggered by a Vercel Cron Job.
export default async function handler(req: any, res: any) {
    // Optional: Secure your endpoint with a secret if it's publicly accessible.
    // This prevents anyone from triggering your reminder function.
    // if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return res.status(401).send('Unauthorized');
    // }

    try {
        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        const vapidSubject = process.env.VAPID_SUBJECT;

        if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
            console.error('VAPID keys are not configured in environment variables.');
            return res.status(500).json({ error: 'VAPID keys not configured on the server.' });
        }

        webpush.setVapidDetails(
            vapidSubject,
            vapidPublicKey,
            vapidPrivateKey
        );

        const subscriptions = await kv.smembers('hydropet_subscriptions');
        if (!subscriptions || subscriptions.length === 0) {
            return res.status(200).json({ message: 'No subscriptions to notify.' });
        }

        const notificationPayload = JSON.stringify({
            title: 'HydroPet Reminder',
            body: 'Your HydroPet is thirsty! Time for some water. 💧',
        });
        
        const promises = subscriptions.map(subStr => {
            const subscription = JSON.parse(subStr);
            return webpush.sendNotification(subscription, notificationPayload)
                .catch(error => {
                    // If a subscription is expired or invalid, the push service returns a 410 Gone status.
                    if (error.statusCode === 410) {
                        console.log('Subscription has expired or is no longer valid, removing it.');
                        return kv.srem('hydropet_subscriptions', subStr); // Remove from KV store
                    } else {
                        console.error('Error sending notification to', subscription.endpoint, error.statusCode);
                    }
                });
        });

        await Promise.all(promises);

        res.status(200).json({ message: `Attempted to send reminders to ${subscriptions.length} subscribers.` });

    } catch (error) {
        console.error('Failed to send reminders:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
