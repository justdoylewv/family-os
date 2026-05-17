import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from './supabase';

const FAMILY_EMAIL =
  import.meta.env.VITE_FAMILY_EMAIL ?? 'family@familyos.local';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

export async function signInWithFamilyPassword(password: string) {
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };
  const { error } = await supabase.auth.signInWithPassword({
    email: FAMILY_EMAIL,
    password,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
