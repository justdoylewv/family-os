import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'node:crypto';
import { requireAuth, getAdminClient } from '../../_lib/auth';
import { SCOPES, oauthClient, redirectUriFor, saveConnection } from '../../_lib/google';

/** Starts the one-time Google sign-in. The state value ties the callback to this request. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const user = await requireAuth(req, res);
  if (!user) return;
  try {
    const state = randomBytes(24).toString('hex');
    await saveConnection(getAdminClient()!, {
      oauth_state: state,
      oauth_state_expires: new Date(Date.now() + 10 * 60000).toISOString(),
    });
    const url = oauthClient(redirectUriFor(req)).generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
      state,
    });
    res.status(200).json({ url });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Could not start Google sign-in' });
  }
}
