import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { getAdminClient } from '../../_lib/auth';
import { getConnection, oauthClient, pickCalendar, redirectUriFor, saveConnection, syncCalendar } from '../../_lib/google';

const page = (title: string, body: string, ok: boolean) => `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:system-ui;background:#000;color:#fff;padding:2rem;text-align:center">
<h2>${title}</h2><p>${body}</p>
<script>if (${ok} && window.opener) { window.opener.postMessage({ type: 'GOOGLE_CONNECTED' }, location.origin); setTimeout(() => window.close(), 1200); }</script>
</body></html>`;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Google sends the family back here once. We keep the refresh token server-side and run a first sync. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const admin = getAdminClient();
  if (!admin) {
    res.status(500).send(page('Not set up', 'The server is missing its Supabase settings.', false));
    return;
  }
  try {
    const code = String(req.query.code ?? '');
    const state = String(req.query.state ?? '');
    const conn = await getConnection(admin);
    const expired = !conn?.oauth_state_expires || new Date(conn.oauth_state_expires).getTime() < Date.now();
    if (!code || !state || conn?.oauth_state !== state || expired) {
      res.status(400).send(page('That link expired', 'Go back to Family OS and tap Connect Google again.', false));
      return;
    }
    const oauth = oauthClient(redirectUriFor(req));
    const { tokens } = await oauth.getToken(code);
    const refresh = tokens.refresh_token ?? conn?.refresh_token;
    if (!refresh) {
      res.status(400).send(page('Almost', 'Google didn’t send a long-term key. Remove Family OS at myaccount.google.com/permissions, then connect again.', false));
      return;
    }
    oauth.setCredentials(tokens);
    const { data } = await google.calendar({ version: 'v3', auth: oauth }).calendarList.list({ minAccessRole: 'writer' });
    const cal = pickCalendar(data.items ?? [], conn?.calendar_id);
    await saveConnection(admin, {
      refresh_token: refresh,
      calendar_id: cal?.id ?? 'primary',
      calendar_name: cal?.summary ?? 'Primary',
      time_zone: cal?.timeZone ?? 'America/New_York',
      oauth_state: null,
      oauth_state_expires: null,
    });
    const result = await syncCalendar(admin);
    res
      .status(200)
      .send(page('Google Calendar connected', `Showing <b>${esc(cal?.summary ?? 'your calendar')}</b>. Synced ${result.added + result.updated} events. You can close this window.`, true));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('OAuth callback error:', message);
    res.status(500).send(page('Connecting failed', esc(message), false));
  }
}
