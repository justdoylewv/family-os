import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient, requireAuth } from '../_lib/auth';
import { calendarFor, getConnection, saveConnection, syncCalendar } from '../_lib/google';

/**
 * GET  -> { connected, calendarId, calendarName, lastSyncedAt }   (?list=1 adds the family's writable calendars)
 * POST { calendarId } -> switch which Google calendar the app shows, then sync.
 * POST { disconnect: true } -> forget the Google connection.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;
  const admin = getAdminClient()!;
  try {
    if (req.method === 'GET') {
      const conn = await getConnection(admin);
      const out: Record<string, unknown> = {
        connected: !!conn?.refresh_token,
        calendarId: conn?.calendar_id ?? null,
        calendarName: conn?.calendar_name ?? null,
        lastSyncedAt: conn?.last_synced_at ?? null,
      };
      if (req.query.list && conn?.refresh_token) {
        const { calendar } = await calendarFor(admin);
        const { data } = await calendar.calendarList.list({ minAccessRole: 'writer' });
        out.calendars = (data.items ?? []).map((c) => ({ id: c.id, name: c.summary, timeZone: c.timeZone }));
      }
      res.status(200).json(out);
      return;
    }
    if (req.method === 'POST') {
      const body = (req.body ?? {}) as { calendarId?: string; disconnect?: boolean };
      if (body.disconnect) {
        await saveConnection(admin, { refresh_token: null, last_synced_at: null });
        res.status(200).json({ connected: false });
        return;
      }
      const { calendar } = await calendarFor(admin);
      const { data } = await calendar.calendarList.list({ minAccessRole: 'writer' });
      const cal = (data.items ?? []).find((c) => c.id === body.calendarId);
      if (!cal) {
        res.status(400).json({ error: 'That calendar isn’t available to this Google account.' });
        return;
      }
      await saveConnection(admin, { calendar_id: cal.id, calendar_name: cal.summary, time_zone: cal.timeZone ?? 'America/New_York' });
      res.status(200).json(await syncCalendar(admin));
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
