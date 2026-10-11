import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient, requireAuth } from '../_lib/auth';
import { NotConnectedError, calendarFor, toRow } from '../_lib/google';

const CATEGORIES = ['family', 'kids', 'parents', 'medical', 'school', 'work', 'other'];

/**
 * POST { title, date, allDay, startTime, endTime, location, category, assigned_to_member_id }
 * Adds the event to the family Google Calendar and to Family OS in one step.
 * 409 not-connected tells the app to save it locally instead.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const user = await requireAuth(req, res);
  if (!user) return;
  const b = (req.body ?? {}) as Record<string, unknown>;
  const title = String(b.title ?? '').trim().slice(0, 200);
  const date = String(b.date ?? '');
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'An event needs a title and a date.' });
    return;
  }
  const admin = getAdminClient()!;
  try {
    const { conn, calendar } = await calendarFor(admin);
    const timeZone = conn.time_zone || 'America/New_York';
    const allDay = b.allDay !== false || !b.startTime;
    const start = String(b.startTime ?? '09:00');
    let end = String(b.endTime ?? '');
    if (!/^\d{2}:\d{2}$/.test(end) || end <= start) end = `${String(Math.min(23, Number(start.slice(0, 2)) + 1)).padStart(2, '0')}:${start.slice(3)}`;
    const next = new Date(`${date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const { data: ev } = await calendar.events.insert({
      calendarId: conn.calendar_id || 'primary',
      requestBody: {
        summary: title,
        location: b.location ? String(b.location).slice(0, 200) : undefined,
        start: allDay ? { date } : { dateTime: `${date}T${start}:00`, timeZone },
        end: allDay ? { date: next.toISOString().slice(0, 10) } : { dateTime: `${date}T${end}:00`, timeZone },
      },
    });
    const category = CATEGORIES.includes(String(b.category)) ? String(b.category) : 'family';
    const row = { ...toRow(ev, timeZone), category, assigned_to_member_id: (b.assigned_to_member_id as string) || null };
    const { error } = await admin.from('events').upsert(row, { onConflict: 'google_event_id' });
    if (error) throw error;
    res.status(200).json({ ok: true, event: row });
  } catch (err) {
    if (err instanceof NotConnectedError) {
      res.status(409).json({ error: 'not-connected' });
      return;
    }
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
