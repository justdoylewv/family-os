import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export function getAdminClient() {
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function requireAuth(req: VercelRequest, res: VercelResponse) {
  const admin = getAdminClient();
  if (!admin) {
    res.status(500).json({ error: 'Server is missing Supabase env vars' });
    return null;
  }
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return null;
  }
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid session' });
    return null;
  }
  return data.user;
}
