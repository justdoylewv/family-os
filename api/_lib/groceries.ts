import type { SupabaseClient } from '@supabase/supabase-js';
import { aisleFor } from '../../src/lib/groceryText';

/**
 * Puts names on the "Need to Buy" list. Pantry items move back to the list,
 * names already on it are skipped, and anything new gets an aisle from its name.
 */
export async function addGroceryNames(admin: SupabaseClient, names: string[]) {
  const { data, error } = await admin.from('groceries').select('id,text,completed');
  if (error) throw error;
  const byName = new Map((data ?? []).map((g) => [String(g.text).toLowerCase(), g]));
  const added: string[] = [];
  const skipped: string[] = [];
  const fresh: { text: string; aisle: string; completed: boolean }[] = [];
  for (const name of names) {
    const hit = byName.get(name.toLowerCase());
    if (hit && !hit.completed) {
      skipped.push(name);
    } else if (hit) {
      const { error: e } = await admin.from('groceries').update({ completed: false }).eq('id', hit.id);
      if (e) throw e;
      added.push(name);
    } else {
      fresh.push({ text: name, aisle: aisleFor(name), completed: false });
      byName.set(name.toLowerCase(), { id: '', text: name, completed: false });
      added.push(name);
    }
  }
  if (fresh.length) {
    const { error: e } = await admin.from('groceries').insert(fresh);
    if (e) throw e;
  }
  return { added, skipped };
}
