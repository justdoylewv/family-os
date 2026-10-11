import { useEffect, useState } from 'react';
import { useSettingsStore } from './db';

// Open-Meteo: free, no API key, and it allows calls straight from the browser.
const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';
const REFRESH_MS = 30 * 60 * 1000;

export interface Place {
  name: string;
  lat: number;
  lon: number;
}

export interface Weather {
  place: string;
  temp: number;
  code: number;
  isDay: boolean;
  days: { date: string; code: number; high: number; low: number; rain: number }[];
}

/** WMO weather codes -> words people use. */
export function describe(code: number) {
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if (code <= 48) return 'Fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  return 'Thunderstorms';
}

const STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

/** "Columbus, OH" or "Hilliard, Ohio" -> coordinates. The state narrows towns that share a name. */
export async function findPlace(query: string): Promise<Place | null> {
  const [town, ...rest] = query.split(',').map((s) => s.trim()).filter(Boolean);
  if (!town) return null;
  const region = rest.join(' ');
  const wanted = (STATES[region.toUpperCase()] ?? region).toLowerCase();
  const res = await fetch(`${GEOCODE}?name=${encodeURIComponent(town)}&count=10&language=en&format=json`);
  if (!res.ok) throw new Error('Couldn’t look up that place.');
  const data = (await res.json()) as {
    results?: { name: string; latitude: number; longitude: number; admin1?: string; country_code?: string }[];
  };
  const hits = data.results ?? [];
  const hit =
    (wanted && hits.find((h) => (h.admin1 ?? '').toLowerCase() === wanted || (h.country_code ?? '').toLowerCase() === wanted)) ||
    hits.find((h) => h.country_code === 'US') ||
    hits[0];
  if (!hit) return null;
  return { name: hit.admin1 && hit.country_code === 'US' ? `${hit.name}, ${hit.admin1}` : hit.name, lat: hit.latitude, lon: hit.longitude };
}

export async function fetchWeather(place: Place): Promise<Weather> {
  const url =
    `${FORECAST}?latitude=${place.lat}&longitude=${place.lon}` +
    '&current=temperature_2m,weather_code,is_day' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    '&temperature_unit=fahrenheit&timezone=auto&forecast_days=4';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather is unavailable right now.');
  const d = await res.json();
  return {
    place: place.name,
    temp: Math.round(d.current.temperature_2m),
    code: d.current.weather_code,
    isDay: d.current.is_day === 1,
    days: (d.daily.time as string[]).map((date, i) => ({
      date,
      code: d.daily.weather_code[i],
      high: Math.round(d.daily.temperature_2m_max[i]),
      low: Math.round(d.daily.temperature_2m_min[i]),
      rain: d.daily.precipitation_probability_max?.[i] ?? 0,
    })),
  };
}

const read = <T,>(k: string): T | null => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* private mode */
  }
};

function deviceLocation(): Promise<Place | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ name: 'Here', lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(null),
      { timeout: 10000, maximumAge: 24 * 3600 * 1000 },
    );
  });
}

/**
 * Live weather for the family's town (Info Hub → Weather), falling back to the tablet's own
 * location if allowed. Refreshes every 30 minutes and keeps the last good reading on a blip.
 */
export function useWeather() {
  const town = useSettingsStore((s) => s.values.weather_location ?? '').trim();
  const [weather, setWeather] = useState<Weather | null>(() => read<Weather>('family_weather_last'));
  const [status, setStatus] = useState<'loading' | 'ok' | 'no-place' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        let place: Place | null = null;
        if (town) {
          const cached = read<{ query: string; place: Place }>('family_weather_place');
          place = cached?.query === town ? cached.place : await findPlace(town);
          if (place) write('family_weather_place', { query: town, place });
        } else {
          place = await deviceLocation();
        }
        if (!place) {
          if (!cancelled) setStatus('no-place');
          return;
        }
        const w = await fetchWeather(place);
        if (cancelled) return;
        setWeather(w);
        setStatus('ok');
        write('family_weather_last', w);
      } catch {
        if (!cancelled) setStatus('error');
      }
    };
    void load();
    const t = window.setInterval(() => {
      if (!document.hidden) void load();
    }, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [town]);

  return { weather, status };
}
