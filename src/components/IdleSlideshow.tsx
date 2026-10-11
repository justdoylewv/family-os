import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEventsStore, useSettingsStore, todayLocalDate } from '../lib/db';
import { authedFetch } from '../lib/auth';
import { occursOn, timeLabel } from '../lib/googleCalendar';

const PHOTO_SECONDS = 12;
const RELOAD_MS = 6 * 60 * 60 * 1000;

function shuffle<T>(a: T[]) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/**
 * After a few minutes with nobody touching the tablet, family photos fill the screen with the
 * clock and what's coming up. Any tap brings the app back. `startRef` lets a nav button start it.
 */
const IdleSlideshow: React.FC<{ startRef?: React.MutableRefObject<(() => void) | null> }> = ({ startRef }) => {
  const idleMinutes = Number(useSettingsStore((s) => s.values.idle_minutes) || 3);
  const albumUrl = useSettingsStore((s) => s.values.photos_album_url ?? '');
  const events = useEventsStore((s) => s.items);

  const [on, setOn] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [layers, setLayers] = useState<[string, string]>(['', '']);
  const [front, setFront] = useState(0);
  const [now, setNow] = useState(new Date());
  const loadedAt = useRef(0);
  const idx = useRef(0);
  const frontRef = useRef(0);

  const loadPhotos = useCallback(async () => {
    if (!albumUrl) {
      setMessage('Add a shared Google Photos album in Info Hub to see family photos here.');
      return [];
    }
    if (photos.length && Date.now() - loadedAt.current < RELOAD_MS) return photos;
    try {
      const res = await authedFetch('/api/photos');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Couldn’t load the album.');
      const list = shuffle((data.photos as string[]) ?? []);
      loadedAt.current = Date.now();
      idx.current = 0;
      setPhotos(list);
      setMessage(list.length ? '' : 'The album came back empty. Check that it’s a shared album link.');
      return list;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Couldn’t load the album.');
      return [];
    }
  }, [albumUrl, photos]);

  const start = useCallback(() => {
    setOn(true);
    void loadPhotos();
  }, [loadPhotos]);
  useEffect(() => {
    if (startRef) startRef.current = start;
  }, [start, startRef]);

  // Idle timer: any touch, key or scroll resets it.
  useEffect(() => {
    let timer = 0;
    const reset = () => {
      window.clearTimeout(timer);
      if (idleMinutes > 0) timer = window.setTimeout(start, idleMinutes * 60000);
    };
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    events.forEach((t) => document.addEventListener(t, reset, { passive: true }));
    reset();
    return () => {
      window.clearTimeout(timer);
      events.forEach((t) => document.removeEventListener(t, reset));
    };
  }, [idleMinutes, start]);

  // Rotate photos with a crossfade; preload the next one before showing it.
  useEffect(() => {
    if (!on || !photos.length) return;
    let cancelled = false;
    const show = () => {
      const url = photos[idx.current++ % photos.length];
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        const next = frontRef.current === 0 ? 1 : 0;
        frontRef.current = next;
        setLayers((l) => (next === 0 ? [url, l[1]] : [l[0], url]));
        setFront(next);
      };
      img.src = url;
    };
    show();
    const t = window.setInterval(show, PHOTO_SECONDS * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [on, photos]);

  useEffect(() => {
    if (!on) return;
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, [on]);

  if (!on) return null;

  const today = todayLocalDate();
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const upcoming = [
    ...events.filter((e) => occursOn(e, today) && (!e.end_at || new Date(e.end_at).getTime() > Date.now())).map((e) => ({ e, when: timeLabel(e) || 'Today' })),
    ...events.filter((e) => occursOn(e, tomorrow) && !occursOn(e, today)).map((e) => ({ e, when: `Tomorrow ${timeLabel(e)}`.trim() })),
  ].slice(0, 3);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black text-white overflow-hidden cursor-pointer"
      onPointerDown={(e) => {
        e.stopPropagation();
        setOn(false);
      }}
      role="button"
      aria-label="Tap to return"
    >
      {layers.map((url, i) =>
        url ? (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-[1600ms] ease-in-out motion-reduce:transition-none"
            style={{ opacity: front === i ? 1 : 0 }}
          >
            <div className="absolute -inset-10 bg-cover bg-center blur-2xl brightness-50" style={{ backgroundImage: `url("${url}")` }} />
            <div className="absolute inset-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${url}")` }} />
          </div>
        ) : null,
      )}
      {message && <p className="absolute inset-0 flex items-center justify-center text-center text-xl text-white/70 p-10">{message}</p>}
      <div className="absolute inset-x-0 bottom-0 px-10 pb-8 pt-24 bg-gradient-to-t from-black/70 to-transparent flex items-end gap-8 flex-wrap">
        <div>
          <div className="text-8xl font-bold tracking-tight tabular-nums drop-shadow-lg">{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
          <div className="text-2xl font-semibold opacity-90 mt-1">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        </div>
        <div className="ml-auto text-right text-xl space-y-1 drop-shadow">
          {upcoming.map(({ e, when }) => (
            <div key={e.id}>
              <b>{when}</b> · {e.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IdleSlideshow;
