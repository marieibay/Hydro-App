
import { kv } from '@vercel/kv';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const subscription = req.body;

    // Basic validation for the subscription object
    if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({ error: 'Invalid subscription object provided' });
    }

    // Use a Set in KV to store unique subscriptions, preventing duplicates
    // The key 'hydropet_subscriptions' will hold all subscription objects.
    await kv.sadd('hydropet_subscriptions', JSON.stringify(subscription));

    res.status(201).json({ message: 'Subscription saved successfully' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    if (error instanceof Error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    } else {
        res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
