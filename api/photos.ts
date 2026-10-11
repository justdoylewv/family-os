import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient, requireAuth } from './_lib/auth';

// Warm functions keep this between requests, so the album page is read a few times a day at most.
let cache: { album: string; at: number; photos: string[] } | null = null;
const CACHE_MS = 6 * 60 * 60 * 1000;

/** Pulls the full-size photo addresses out of a shared Google Photos album page. */
export function parseAlbum(html: string) {
  const seen = new Set<string>();
  const out: string[] = [];
  // Album items appear as ["https://lh3.googleusercontent.com/pw/...",width,height,...
  const re = /\["(https:\/\/lh3\.googleusercontent\.com\/pw\/[A-Za-z0-9_-]+)",(\d+),(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    // Skip small images (avatars, the album cover thumbnail).
    if (Number(m[2]) < 300 || Number(m[3]) < 300 || seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push(m[1]);
  }
  return out;
}

/**
 * GET -> { photos: string[] } for the idle slideshow, from the shared album link saved in
 * Info Hub. Google's Photos API no longer lets apps read existing albums, so this reads the
 * album's share page the same way a browser does.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;
  const admin = getAdminClient()!;
  const { data } = await admin.from('settings').select('value').eq('key', 'photos_album_url').maybeSingle();
  const album = String(data?.value ?? '').trim();
  if (!album) {
    res.status(200).json({ photos: [], reason: 'no-album' });
    return;
  }
  let host = '';
  try {
    host = new URL(album).hostname;
  } catch {
    /* handled below */
  }
  if (!/^(photos\.app\.goo\.gl|photos\.google\.com|goo\.gl)$/.test(host)) {
    res.status(400).json({ error: 'That isn’t a Google Photos share link.' });
    return;
  }
  if (cache && cache.album === album && Date.now() - cache.at < CACHE_MS && !req.query.refresh) {
    res.status(200).json({ photos: cache.photos });
    return;
  }
  try {
    const page = await fetch(album, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 FamilyOS' } });
    const photos = parseAlbum(await page.text()).map((u) => `${u}=w1920-h1080`);
    cache = { album, at: Date.now(), photos };
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.status(200).json(photos.length ? { photos } : { photos, reason: 'empty' });
  } catch (err) {
    console.error('photos error:', err);
    res.status(502).json({ error: 'Couldn’t read the photo album right now.' });
  }
}
