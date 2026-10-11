import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import { getAdminClient } from './_lib/auth';
import { addGroceryNames } from './_lib/groceries';
import { splitItems } from '../src/lib/groceryText';

/**
 * "Hey Siri, add groceries" endpoint for an iOS Shortcut.
 * POST { token, text } where token matches SHORTCUT_TOKEN. Replies with a sentence for Siri to read.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  if (req.method !== 'POST') {
    res.status(405).send('Use POST.');
    return;
  }
  const expected = process.env.SHORTCUT_TOKEN ?? '';
  const body = (typeof req.body === 'string' ? safeJson(req.body) : req.body) ?? {};
  const token = String(body.token ?? req.headers['x-family-token'] ?? '');
  if (!expected || !sameSecret(token, expected)) {
    res.status(401).send('That shortcut token didn’t match.');
    return;
  }
  const admin = getAdminClient();
  if (!admin) {
    res.status(500).send('The server is missing its Supabase settings.');
    return;
  }
  const items = splitItems(String(body.text ?? ''));
  if (!items.length) {
    res.status(200).send('I didn’t catch any groceries.');
    return;
  }
  try {
    const { added, skipped } = await addGroceryNames(admin, items);
    let msg = added.length ? `Added ${joinWords(added).toLowerCase()} to the grocery list.` : '';
    if (skipped.length) msg += ` ${joinWords(skipped)} ${skipped.length > 1 ? 'were' : 'was'} already on it.`;
    res.status(200).send(msg.trim());
  } catch (err) {
    console.error('add-groceries error:', err);
    res.status(500).send('Saving to the grocery list failed.');
  }
}

function safeJson(s: string) {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function joinWords(list: string[]) {
  return list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}
