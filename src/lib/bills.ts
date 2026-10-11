import type { Bill, Cadence } from '../types';

export const CADENCES: Cadence[] = ['weekly', 'monthly', 'quarterly', 'yearly'];
export const BILL_CATEGORIES = ['Housing', 'Utilities', 'Insurance', 'Subscriptions', 'Loans', 'Kids', 'Health', 'Car', 'Other'];

const MONTHS_PER: Record<Cadence, number> = { weekly: 12 / 52, monthly: 1, quarterly: 3, yearly: 12 };

/** What a bill costs per month on average (yearly / 12, weekly × 52 / 12, …). */
export function monthlyCost(b: Pick<Bill, 'amount' | 'cadence'>) {
  return Number(b.amount) / MONTHS_PER[b.cadence];
}

const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The n-th due date counting from the anchor (n can be negative). Month ends clamp: Jan 31 → Feb 28. */
function step(anchor: string, cadence: Cadence, n: number) {
  const a = parse(anchor);
  if (cadence === 'weekly') return new Date(a.getFullYear(), a.getMonth(), a.getDate() + 7 * n);
  const months = MONTHS_PER[cadence] * n;
  const first = new Date(a.getFullYear(), a.getMonth() + months, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(a.getDate(), last));
}

/** Every due date in [from, to], oldest first. */
export function dueDates(b: Pick<Bill, 'anchor_date' | 'cadence'>, from: string, to: string) {
  const out: string[] = [];
  const perYear = { weekly: 52, monthly: 12, quarterly: 4, yearly: 1 }[b.cadence];
  // Jump close to `from` first so old anchors don't loop for years.
  const years = (parse(from).getTime() - parse(b.anchor_date).getTime()) / (365.25 * 864e5);
  let n = Math.floor(years * perYear) - 2;
  for (let guard = 0; guard < 600; guard++, n++) {
    const d = ymd(step(b.anchor_date, b.cadence, n));
    if (d > to) break;
    if (d >= from) out.push(d);
  }
  return out;
}

/** The first due date on or after `today`. */
export function nextDue(b: Pick<Bill, 'anchor_date' | 'cadence'>, today: string) {
  const far = ymd(new Date(parse(today).getFullYear() + 2, parse(today).getMonth(), parse(today).getDate()));
  return dueDates(b, today, far)[0] ?? today;
}

/** The most recent due date before `today`, if the bill had one. */
export function previousDue(b: Pick<Bill, 'anchor_date' | 'cadence'>, today: string) {
  const yesterday = ymd(new Date(parse(today).getTime() - 864e5));
  const start = ymd(new Date(parse(today).getFullYear() - 2, parse(today).getMonth(), 1));
  const past = dueDates(b, start, yesterday).filter((d) => d >= b.anchor_date);
  return past[past.length - 1] ?? null;
}

/** A manual (non-autopay) bill is overdue when its last due date passed without being marked paid. */
export function isOverdue(b: Bill, today: string) {
  if (b.autopay || !b.active) return false;
  const prev = previousDue(b, today);
  return !!prev && (!b.last_paid || b.last_paid < prev);
}

export function daysUntil(date: string, today: string) {
  return Math.round((parse(date).getTime() - parse(today).getTime()) / 864e5);
}

export const money = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
