import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient, requireAuth } from '../_lib/auth';
import { NotConnectedError, syncCalendar } from '../_lib/google';

/** POST: pull the family Google Calendar into Family OS. Also callable by a Vercel cron with CRON_SECRET. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cron = process.env.CRON_SECRET && req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
  if (!cron) {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    const user = await requireAuth(req, res);
    if (!user) return;
  }
  try {
    res.status(200).json(await syncCalendar(getAdminClient()!));
  } catch (err) {
    if (err instanceof NotConnectedError) {
      res.status(409).json({ error: 'not-connected' });
      return;
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('calendar sync error:', message);
    res.status(/invalid_grant/.test(message) ? 401 : 500).json({
      error: /invalid_grant/.test(message) ? 'Google access was removed. Tap Connect Google again.' : message,
    });
  }
}
