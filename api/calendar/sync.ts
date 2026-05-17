import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { requireAuth } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const { tokens } = (req.body ?? {}) as { tokens?: unknown };
  if (!tokens) {
    res.status(400).json({ error: 'Missing tokens' });
    return;
  }

  try {
    const oauth = new google.auth.OAuth2();
    oauth.setCredentials(tokens as Record<string, unknown>);
    const calendar = google.calendar({ version: 'v3', auth: oauth });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    res.status(200).json({ events: response.data.items ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('calendar sync error:', message);
    res.status(500).json({ error: message });
  }
}
