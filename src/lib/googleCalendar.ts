import { useEffect } from 'react';
import { create } from 'zustand';
import { authedFetch } from './auth';
import { supabaseConfigured } from './supabase';
import type { CalendarEvent } from '../types';

const SYNC_EVERY_MS = 10 * 60 * 1000;

interface GoogleState {
  checked: boolean;
  connected: boolean;
  calendarName: string | null;
  lastSyncedAt: string | null;
  syncing: boolean;
  error: string;
  refresh: () => Promise<void>;
  sync: () => Promise<void>;
  connect: () => Promise<void>;
}

/** The family's Google Calendar connection. The token lives on the server; this only tracks status. */
export const useGoogleCalendar = create<GoogleState>((set, get) => ({
  checked: false,
  connected: false,
  calendarName: null,
  lastSyncedAt: null,
  syncing: false,
  error: '',

  async refresh() {
    if (!supabaseConfigured) {
      set({ checked: true });
      return;
    }
    try {
      const res = await authedFetch('/api/calendar/settings');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not check Google Calendar');
      set({ checked: true, connected: data.connected, calendarName: data.calendarName, lastSyncedAt: data.lastSyncedAt, error: '' });
    } catch (err) {
      set({ checked: true, error: err instanceof Error ? err.message : 'Could not check Google Calendar' });
    }
  },

  async sync() {
    if (!get().connected || get().syncing) return;
    set({ syncing: true });
    try {
      const res = await authedFetch('/api/calendar/sync', { method: 'POST' });
      const data = await res.json();
      if (res.status === 409) set({ connected: false });
      else if (!res.ok) throw new Error(data.error || 'Sync failed');
      else set({ lastSyncedAt: data.lastSyncedAt, calendarName: data.calendarName ?? get().calendarName, error: '' });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Sync failed' });
    } finally {
      set({ syncing: false });
    }
  },

  async connect() {
    // Open the window first (inside the tap) so Safari doesn't block it as a popup.
    const win = window.open('', 'google_connect', 'width=520,height=680');
    try {
      const res = await authedFetch('/api/auth/google/url');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start Google sign-in');
      if (win) win.location.href = data.url;
      else window.location.href = data.url;
    } catch (err) {
      win?.close();
      set({ error: err instanceof Error ? err.message : 'Could not start Google sign-in' });
    }
  },
}));

/** Keeps the family calendar in sync while any page of the app is open (the wall tablet never closes). */
export function useGoogleCalendarSync() {
  const refresh = useGoogleCalendar((s) => s.refresh);
  const sync = useGoogleCalendar((s) => s.sync);
  const connected = useGoogleCalendar((s) => s.connected);

  useEffect(() => {
    void refresh();
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === 'GOOGLE_CONNECTED') void refresh();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [refresh]);

  useEffect(() => {
    if (!connected) return;
    void sync();
    const timer = window.setInterval(() => {
      if (!document.hidden) void sync();
    }, SYNC_EVERY_MS);
    const onVisible = () => {
      if (!document.hidden) void sync();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [connected, sync]);
}

/** Adds to Google when connected; returns false so the caller can save locally otherwise. */
export async function createOnGoogle(ev: {
  title: string;
  date: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
  location?: string;
  category: string;
  assigned_to_member_id: string | null;
}) {
  if (!useGoogleCalendar.getState().connected) return false;
  const res = await authedFetch('/api/calendar/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ev),
  });
  if (res.status === 409) {
    useGoogleCalendar.setState({ connected: false });
    return false;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not add to Google Calendar');
  return true;
}

/** True when the event covers this YYYY-MM-DD day (multi-day events show on each day). */
export function occursOn(e: CalendarEvent, day: string) {
  return e.date === day || (!!e.end_date && e.date <= day && day <= e.end_date);
}

export function timeLabel(e: CalendarEvent) {
  if (e.all_day !== false || !e.start_at) return '';
  return new Date(e.start_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(':00', '').replace(/\s/g, '').toLowerCase();
}
