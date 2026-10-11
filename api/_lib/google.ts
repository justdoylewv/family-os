import type { VercelRequest } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { google, type calendar_v3 } from 'googleapis';

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];
const PAST_DAYS = 31;
const FUTURE_DAYS = 180;

export class NotConnectedError extends Error {
  constructor() {
    super('Google Calendar is not connected yet.');
  }
}

export interface Connection {
  id: string;
  refresh_token: string | null;
  calendar_id: string | null;
  calendar_name: string | null;
  time_zone: string | null;
  oauth_state: string | null;
  oauth_state_expires: string | null;
  last_synced_at: string | null;
}

export function redirectUriFor(req: VercelRequest) {
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https';
  const host = (req.headers['x-forwarded-host'] as string) ?? req.headers.host;
  return `${proto}://${host}/api/auth/google/callback`;
}

export function oauthClient(redirectUri?: string) {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!id || !secret) throw new Error('Google OAuth env vars are not configured.');
  return new google.auth.OAuth2(id, secret, redirectUri);
}

export async function getConnection(admin: SupabaseClient): Promise<Connection | null> {
  const { data, error } = await admin.from('google_connection').select('*').eq('id', 'family').maybeSingle();
  if (error) throw new Error(`Run supabase/migrations/20261011_google_calendar_sync.sql in Supabase first (${error.message}).`);
  return (data as Connection) ?? null;
}

export async function saveConnection(admin: SupabaseClient, patch: Partial<Connection>) {
  const { error } = await admin
    .from('google_connection')
    .upsert({ id: 'family', ...patch, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) throw error;
}

export async function calendarFor(admin: SupabaseClient) {
  const conn = await getConnection(admin);
  if (!conn?.refresh_token) throw new NotConnectedError();
  const auth = oauthClient();
  auth.setCredentials({ refresh_token: conn.refresh_token });
  return { conn, calendar: google.calendar({ version: 'v3', auth }) };
}

/** Prefer a calendar named like "Family" (the Maurer Family calendar), else the primary one. */
export function pickCalendar(list: calendar_v3.Schema$CalendarListEntry[], current?: string | null) {
  return (
    list.find((c) => c.id === current) ??
    list.find((c) => /family/i.test(c.summary ?? '')) ??
    list.find((c) => c.primary) ??
    list[0]
  );
}

export function localDate(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

const addDaysIso = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function inferCategory(title: string) {
  if (/doctor|dentist|ortho|pediatric|appointment|therap|vaccine|checkup|clinic|vet\b/i.test(title)) return 'medical';
  if (/school|class|conference|pta|field trip|homework|teacher|report card/i.test(title)) return 'school';
  if (/work|meeting|shoot|client|office|deadline/i.test(title)) return 'work';
  if (/practice|game|soccer|baseball|basketball|swim|dance|camp|birthday party|playdate|lesson/i.test(title)) return 'kids';
  return 'family';
}

/** Google event -> the columns sync owns. Category and assignment stay the family's to set. */
export function toRow(ev: calendar_v3.Schema$Event, timeZone: string) {
  const allDay = !!ev.start?.date;
  const date = allDay ? ev.start!.date! : localDate(ev.start!.dateTime!, timeZone);
  const lastDay = allDay
    ? addDaysIso(ev.end?.date ?? date, -1)
    : localDate(ev.end?.dateTime ?? ev.start!.dateTime!, timeZone);
  return {
    google_event_id: ev.id!,
    title: (ev.summary ?? 'Busy').slice(0, 200),
    date,
    end_date: lastDay > date ? lastDay : null,
    all_day: allDay,
    start_at: allDay ? null : ev.start!.dateTime!,
    end_at: allDay ? null : (ev.end?.dateTime ?? null),
    location: (ev.location ?? '').slice(0, 200),
  };
}

/**
 * Pulls the family calendar into the events table: new events are inserted (with a guessed
 * category and family member), changed ones updated, and ones deleted in Google removed.
 */
export async function syncCalendar(admin: SupabaseClient) {
  const { conn, calendar } = await calendarFor(admin);
  const calendarId = conn.calendar_id || 'primary';
  const timeZone = conn.time_zone || 'America/New_York';
  const now = Date.now();
  const timeMin = new Date(now - PAST_DAYS * 864e5);
  const timeMax = new Date(now + FUTURE_DAYS * 864e5);

  const items: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  do {
    const { data } = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500,
      pageToken,
    });
    items.push(...(data.items ?? []));
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);

  const rows = items.filter((e) => e.id && e.status !== 'cancelled' && (e.start?.date || e.start?.dateTime)).map((e) => toRow(e, timeZone));
  const fromDate = localDate(timeMin.toISOString(), timeZone);
  const toDate = localDate(timeMax.toISOString(), timeZone);

  const { data: existing, error: exErr } = await admin
    .from('events')
    .select('id,google_event_id,date')
    .not('google_event_id', 'is', null);
  if (exErr) throw exErr;
  const known = new Map((existing ?? []).map((e) => [e.google_event_id as string, e]));

  const { data: members } = await admin.from('members').select('id,name');
  const memberFor = (title: string) =>
    (members ?? []).find((m) => new RegExp(`\\b${String(m.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(title))?.id ?? null;

  const fresh = rows.filter((r) => !known.has(r.google_event_id));
  const changed = rows.filter((r) => known.has(r.google_event_id));
  if (fresh.length) {
    const { error } = await admin
      .from('events')
      .insert(fresh.map((r) => ({ ...r, category: inferCategory(r.title), assigned_to_member_id: memberFor(r.title) })));
    if (error) throw error;
  }
  if (changed.length) {
    // Upsert only the Google-owned columns, so the family's category/assignment edits survive.
    const { error } = await admin.from('events').upsert(changed, { onConflict: 'google_event_id' });
    if (error) throw error;
  }
  const seen = new Set(rows.map((r) => r.google_event_id));
  const gone = (existing ?? [])
    .filter((e) => !seen.has(e.google_event_id as string) && e.date >= fromDate && e.date <= toDate)
    .map((e) => e.id as string);
  if (gone.length) {
    const { error } = await admin.from('events').delete().in('id', gone);
    if (error) throw error;
  }
  const lastSyncedAt = new Date().toISOString();
  await saveConnection(admin, { last_synced_at: lastSyncedAt });
  return { added: fresh.length, updated: changed.length, removed: gone.length, calendarName: conn.calendar_name, lastSyncedAt };
}
