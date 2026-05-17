import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { requireAuth } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'Google OAuth env vars not configured' });
    return;
  }

  const redirectUri = (req.query.redirectUri as string | undefined) ?? '';
  if (!redirectUri) {
    res.status(400).json({ error: 'Missing redirectUri' });
    return;
  }

  const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const url = oauth.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    prompt: 'consent',
  });

  res.status(200).json({ url });
}
