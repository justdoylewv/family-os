import { useEffect } from 'react';
import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from './supabase';
import { DAYS_OF_WEEK, MEMBER_COLORS } from '../constants';
import type {
  Chore,
  Contact,
  CalendarEvent,
  GroceryItem,
  MealPlan,
  Member,
  Reward,
} from '../types';

type TableName =
  | 'members'
  | 'events'
  | 'groceries'
  | 'chores'
  | 'rewards'
  | 'meals'
  | 'settings'
  | 'info_contacts';

const localKey = (t: TableName) => `family_${t}`;

function loadLocal<T>(t: TableName, fallback: T): T {
  try {
    const raw = localStorage.getItem(localKey(t));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveLocal<T>(t: TableName, data: T) {
  try {
    localStorage.setItem(localKey(t), JSON.stringify(data));
  } catch {
    /* quota or private mode — ignore */
  }
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

// ---- Members ----

interface MembersStore {
  items: Member[];
  loaded: boolean;
  channel: RealtimeChannel | null;
  init: () => Promise<void>;
  add: (m: Omit<Member, 'id'>) => Promise<void>;
  update: (id: string, patch: Partial<Member>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  adjustPoints: (id: string, delta: number) => Promise<void>;
}

export const useMembersStore = create<MembersStore>((set, get) => ({
  items: [],
  loaded: false,
  channel: null,

  async init() {
    if (get().loaded) return;
    if (!supabase) {
      const seeded = loadLocal<Member[]>('members', [
        { id: makeId(), name: 'Mom', points: 0, avatar_color: 'bg-purple-500' },
        { id: makeId(), name: 'Dad', points: 0, avatar_color: 'bg-green-500' },
        { id: makeId(), name: 'Otto', points: 0, avatar_color: 'bg-blue-500' },
      ]);
      set({ items: seeded, loaded: true });
      saveLocal('members', seeded);
      return;
    }
    const { data } = await supabase
      .from('members')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    set({ items: data ?? [], loaded: true });

    const sb = supabase;
    const channel = sb
      .channel('members-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, async () => {
        const { data: refreshed } = await sb
          .from('members')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });
        set({ items: refreshed ?? [] });
      })
      .subscribe();
    set({ channel });
  },

  async add(m) {
    if (!supabase) {
      const next = [...get().items, { ...m, id: makeId() }];
      set({ items: next });
      saveLocal('members', next);
      return;
    }
    await supabase.from('members').insert(m);
  },

  async update(id, patch) {
    if (!supabase) {
      const next = get().items.map((x) => (x.id === id ? { ...x, ...patch } : x));
      set({ items: next });
      saveLocal('members', next);
      return;
    }
    await supabase.from('members').update(patch).eq('id', id);
  },

  async remove(id) {
    if (!supabase) {
      const next = get().items.filter((x) => x.id !== id);
      set({ items: next });
      saveLocal('members', next);
      return;
    }
    await supabase.from('members').delete().eq('id', id);
  },

  async adjustPoints(id, delta) {
    const m = get().items.find((x) => x.id === id);
    if (!m) return;
    const next = Math.max(0, m.points + delta);
    await get().update(id, { points: next });
  },
}));

// ---- Events ----

interface EventsStore {
  items: CalendarEvent[];
  loaded: boolean;
  channel: RealtimeChannel | null;
  init: () => Promise<void>;
  add: (e: Omit<CalendarEvent, 'id'>) => Promise<void>;
  addMany: (events: Omit<CalendarEvent, 'id'>[]) => Promise<void>;
  update: (id: string, patch: Partial<CalendarEvent>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useEventsStore = create<EventsStore>((set, get) => ({
  items: [],
  loaded: false,
  channel: null,

  async init() {
    if (get().loaded) return;
    if (!supabase) {
      const seeded = loadLocal<CalendarEvent[]>('events', []);
      set({ items: seeded, loaded: true });
      return;
    }
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    set({ items: data ?? [], loaded: true });

    const sb = supabase;
    const channel = sb
      .channel('events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, async () => {
        const { data: refreshed } = await sb
          .from('events')
          .select('*')
          .order('date', { ascending: true });
        set({ items: refreshed ?? [] });
      })
      .subscribe();
    set({ channel });
  },

  async add(e) {
    if (!supabase) {
      const next = [...get().items, { ...e, id: makeId() }];
      set({ items: next });
      saveLocal('events', next);
      return;
    }
    await supabase.from('events').insert(e);
  },

  async addMany(events) {
    if (events.length === 0) return;
    if (!supabase) {
      const withIds = events.map((e) => ({ ...e, id: makeId() }));
      const next = [...get().items, ...withIds];
      set({ items: next });
      saveLocal('events', next);
      return;
    }
    await supabase.from('events').insert(events);
  },

  async update(id, patch) {
    if (!supabase) {
      const next = get().items.map((x) => (x.id === id ? { ...x, ...patch } : x));
      set({ items: next });
      saveLocal('events', next);
      return;
    }
    await supabase.from('events').update(patch).eq('id', id);
  },

  async remove(id) {
    if (!supabase) {
      const next = get().items.filter((x) => x.id !== id);
      set({ items: next });
      saveLocal('events', next);
      return;
    }
    await supabase.from('events').delete().eq('id', id);
  },
}));

// ---- Groceries ----

interface GroceriesStore {
  items: GroceryItem[];
  loaded: boolean;
  channel: RealtimeChannel | null;
  init: () => Promise<void>;
  add: (g: Omit<GroceryItem, 'id'>) => Promise<void>;
  update: (id: string, patch: Partial<GroceryItem>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useGroceriesStore = create<GroceriesStore>((set, get) => ({
  items: [],
  loaded: false,
  channel: null,

  async init() {
    if (get().loaded) return;
    if (!supabase) {
      const seeded = loadLocal<GroceryItem[]>('groceries', []);
      set({ items: seeded, loaded: true });
      return;
    }
    const { data } = await supabase
      .from('groceries')
      .select('*')
      .order('created_at', { ascending: false });
    set({ items: data ?? [], loaded: true });

    const sb = supabase;
    const channel = sb
      .channel('groceries-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groceries' }, async () => {
        const { data: refreshed } = await sb
          .from('groceries')
          .select('*')
          .order('created_at', { ascending: false });
        set({ items: refreshed ?? [] });
      })
      .subscribe();
    set({ channel });
  },

  async add(g) {
    if (!supabase) {
      const next = [{ ...g, id: makeId() }, ...get().items];
      set({ items: next });
      saveLocal('groceries', next);
      return;
    }
    await supabase.from('groceries').insert(g);
  },

  async update(id, patch) {
    if (!supabase) {
      const next = get().items.map((x) => (x.id === id ? { ...x, ...patch } : x));
      set({ items: next });
      saveLocal('groceries', next);
      return;
    }
    await supabase.from('groceries').update(patch).eq('id', id);
  },

  async remove(id) {
    if (!supabase) {
      const next = get().items.filter((x) => x.id !== id);
      set({ items: next });
      saveLocal('groceries', next);
      return;
    }
    await supabase.from('groceries').delete().eq('id', id);
  },
}));

// ---- Chores ----

interface ChoresStore {
  items: Chore[];
  loaded: boolean;
  channel: RealtimeChannel | null;
  init: () => Promise<void>;
  add: (c: Omit<Chore, 'id'>) => Promise<void>;
  update: (id: string, patch: Partial<Chore>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useChoresStore = create<ChoresStore>((set, get) => ({
  items: [],
  loaded: false,
  channel: null,

  async init() {
    if (get().loaded) return;
    if (!supabase) {
      const seeded = loadLocal<Chore[]>('chores', []);
      set({ items: seeded, loaded: true });
      return;
    }
    const { data } = await supabase
      .from('chores')
      .select('*')
      .order('created_at', { ascending: false });
    set({ items: data ?? [], loaded: true });

    const sb = supabase;
    const channel = sb
      .channel('chores-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chores' }, async () => {
        const { data: refreshed } = await sb
          .from('chores')
          .select('*')
          .order('created_at', { ascending: false });
        set({ items: refreshed ?? [] });
      })
      .subscribe();
    set({ channel });
  },

  async add(c) {
    if (!supabase) {
      const next = [{ ...c, id: makeId() }, ...get().items];
      set({ items: next });
      saveLocal('chores', next);
      return;
    }
    await supabase.from('chores').insert(c);
  },

  async update(id, patch) {
    if (!supabase) {
      const next = get().items.map((x) => (x.id === id ? { ...x, ...patch } : x));
      set({ items: next });
      saveLocal('chores', next);
      return;
    }
    await supabase.from('chores').update(patch).eq('id', id);
  },

  async remove(id) {
    if (!supabase) {
      const next = get().items.filter((x) => x.id !== id);
      set({ items: next });
      saveLocal('chores', next);
      return;
    }
    await supabase.from('chores').delete().eq('id', id);
  },
}));

// ---- Rewards ----

interface RewardsStore {
  items: Reward[];
  loaded: boolean;
  channel: RealtimeChannel | null;
  init: () => Promise<void>;
  update: (id: string, patch: Partial<Reward>) => Promise<void>;
}

export const useRewardsStore = create<RewardsStore>((set, get) => ({
  items: [],
  loaded: false,
  channel: null,

  async init() {
    if (get().loaded) return;
    if (!supabase) {
      const seeded = loadLocal<Reward[]>('rewards', [
        { id: makeId(), points: 100, description: '1 Hour Extra Screen Time', sort_order: 0 },
        { id: makeId(), points: 250, description: 'Pizza & Movie Night', sort_order: 1 },
        { id: makeId(), points: 500, description: 'Skip a Chore Pass', sort_order: 2 },
      ]);
      set({ items: seeded, loaded: true });
      saveLocal('rewards', seeded);
      return;
    }
    const { data } = await supabase
      .from('rewards')
      .select('*')
      .order('sort_order', { ascending: true });
    set({ items: data ?? [], loaded: true });

    const sb = supabase;
    const channel = sb
      .channel('rewards-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards' }, async () => {
        const { data: refreshed } = await sb
          .from('rewards')
          .select('*')
          .order('sort_order', { ascending: true });
        set({ items: refreshed ?? [] });
      })
      .subscribe();
    set({ channel });
  },

  async update(id, patch) {
    if (!supabase) {
      const next = get().items.map((x) => (x.id === id ? { ...x, ...patch } : x));
      set({ items: next });
      saveLocal('rewards', next);
      return;
    }
    await supabase.from('rewards').update(patch).eq('id', id);
  },
}));

// ---- Meals ----

interface MealsStore {
  items: MealPlan[];
  loaded: boolean;
  channel: RealtimeChannel | null;
  init: () => Promise<void>;
  setMeal: (day: string, slot: 'lunch' | 'dinner', value: string) => Promise<void>;
}

export const useMealsStore = create<MealsStore>((set, get) => ({
  items: [],
  loaded: false,
  channel: null,

  async init() {
    if (get().loaded) return;
    if (!supabase) {
      const seeded = loadLocal<MealPlan[]>(
        'meals',
        DAYS_OF_WEEK.map((day) => ({ day, lunch: '', dinner: '' })),
      );
      set({ items: seeded, loaded: true });
      saveLocal('meals', seeded);
      return;
    }
    const { data } = await supabase.from('meals').select('*');
    const map = new Map<string, MealPlan>(
      (data ?? []).map((row: MealPlan) => [row.day, row]),
    );
    const ordered = DAYS_OF_WEEK.map(
      (day) => map.get(day) ?? { day, lunch: '', dinner: '' },
    );
    set({ items: ordered, loaded: true });

    const sb = supabase;
    const channel = sb
      .channel('meals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals' }, async () => {
        const { data: refreshed } = await sb.from('meals').select('*');
        const m = new Map<string, MealPlan>(
          (refreshed ?? []).map((row: MealPlan) => [row.day, row]),
        );
        const o = DAYS_OF_WEEK.map(
          (day) => m.get(day) ?? { day, lunch: '', dinner: '' },
        );
        set({ items: o });
      })
      .subscribe();
    set({ channel });
  },

  async setMeal(day, slot, value) {
    if (!supabase) {
      const next = get().items.map((m) => (m.day === day ? { ...m, [slot]: value } : m));
      set({ items: next });
      saveLocal('meals', next);
      return;
    }
    await supabase.from('meals').upsert({ day, [slot]: value });
  },
}));

// ---- Settings (single-row key/value: scratchpad, wifi name/pass) ----

interface SettingsStore {
  values: Record<string, string>;
  loaded: boolean;
  channel: RealtimeChannel | null;
  init: () => Promise<void>;
  get: (key: string, fallback?: string) => string;
  set: (key: string, value: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  values: {},
  loaded: false,
  channel: null,

  async init() {
    if (get().loaded) return;
    if (!supabase) {
      const seeded = loadLocal<Record<string, string>>('settings', {});
      set({ values: seeded, loaded: true });
      return;
    }
    const { data } = await supabase.from('settings').select('*');
    const values: Record<string, string> = {};
    for (const row of data ?? []) values[row.key] = row.value;
    set({ values, loaded: true });

    const sb = supabase;
    const channel = sb
      .channel('settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, async () => {
        const { data: refreshed } = await sb.from('settings').select('*');
        const v: Record<string, string> = {};
        for (const row of refreshed ?? []) v[row.key] = row.value;
        set({ values: v });
      })
      .subscribe();
    set({ channel });
  },

  get(key, fallback = '') {
    return get().values[key] ?? fallback;
  },

  async set(key, value) {
    if (!supabase) {
      const next = { ...get().values, [key]: value };
      set({ values: next });
      saveLocal('settings', next);
      return;
    }
    await supabase.from('settings').upsert({ key, value });
  },
}));

// ---- Info contacts ----

interface ContactsStore {
  items: Contact[];
  loaded: boolean;
  channel: RealtimeChannel | null;
  init: () => Promise<void>;
  add: (c: Omit<Contact, 'id'>) => Promise<void>;
  update: (id: string, patch: Partial<Contact>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useContactsStore = create<ContactsStore>((set, get) => ({
  items: [],
  loaded: false,
  channel: null,

  async init() {
    if (get().loaded) return;
    if (!supabase) {
      const seeded = loadLocal<Contact[]>('info_contacts', []);
      set({ items: seeded, loaded: true });
      return;
    }
    const { data } = await supabase
      .from('info_contacts')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    set({ items: data ?? [], loaded: true });

    const sb = supabase;
    const channel = sb
      .channel('info_contacts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'info_contacts' }, async () => {
        const { data: refreshed } = await sb
          .from('info_contacts')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });
        set({ items: refreshed ?? [] });
      })
      .subscribe();
    set({ channel });
  },

  async add(c) {
    if (!supabase) {
      const next = [...get().items, { ...c, id: makeId() }];
      set({ items: next });
      saveLocal('info_contacts', next);
      return;
    }
    await supabase.from('info_contacts').insert(c);
  },

  async update(id, patch) {
    if (!supabase) {
      const next = get().items.map((x) => (x.id === id ? { ...x, ...patch } : x));
      set({ items: next });
      saveLocal('info_contacts', next);
      return;
    }
    await supabase.from('info_contacts').update(patch).eq('id', id);
  },

  async remove(id) {
    if (!supabase) {
      const next = get().items.filter((x) => x.id !== id);
      set({ items: next });
      saveLocal('info_contacts', next);
      return;
    }
    await supabase.from('info_contacts').delete().eq('id', id);
  },
}));

// ---- Bootstrap helper ----

export function useBootstrapStores() {
  const initMembers = useMembersStore((s) => s.init);
  const initEvents = useEventsStore((s) => s.init);
  const initGroceries = useGroceriesStore((s) => s.init);
  const initChores = useChoresStore((s) => s.init);
  const initRewards = useRewardsStore((s) => s.init);
  const initMeals = useMealsStore((s) => s.init);
  const initSettings = useSettingsStore((s) => s.init);
  const initContacts = useContactsStore((s) => s.init);

  useEffect(() => {
    void initMembers();
    void initEvents();
    void initGroceries();
    void initChores();
    void initRewards();
    void initMeals();
    void initSettings();
    void initContacts();
  }, [
    initMembers,
    initEvents,
    initGroceries,
    initChores,
    initRewards,
    initMeals,
    initSettings,
    initContacts,
  ]);
}

// ---- Helper: lookup ----

export { supabaseConfigured };

// Local-date string (YYYY-MM-DD) for the user's timezone — fixes the UTC
// off-by-one that the original code had.
export function todayLocalDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function nextMemberColor(existing: { avatar_color?: string }[]) {
  const used = new Set(existing.map((m) => m.avatar_color));
  return MEMBER_COLORS.find((c) => !used.has(c)) ?? MEMBER_COLORS[0];
}
