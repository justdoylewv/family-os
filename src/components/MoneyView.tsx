import React, { useMemo, useState } from 'react';
import { Lock, Plus, Repeat, AlertTriangle, CalendarClock, X } from 'lucide-react';
import { useAdminGate } from '../lib/admin';
import { useBillsStore, todayLocalDate } from '../lib/db';
import { BILL_CATEGORIES, CADENCES, daysUntil, dueDates, isOverdue, money, monthlyCost, nextDue, previousDue, ymd } from '../lib/bills';
import type { Bill, Cadence } from '../types';

type Draft = Omit<Bill, 'id'>;
const EMPTY: Draft = {
  name: '',
  amount: 0,
  cadence: 'monthly',
  anchor_date: todayLocalDate(),
  autopay: true,
  pay_from: '',
  category: 'Subscriptions',
  account_email: '',
  website: '',
  notes: '',
  last_paid: null,
  active: true,
};

const plusDays = (today: string, n: number) => {
  const [y, m, d] = today.split('-').map(Number);
  return ymd(new Date(y, m - 1, d + n));
};
const prettyDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

/** Bills & subscriptions. Behind admin mode so finances don't sit on the family-room wall. */
const MoneyView: React.FC = () => {
  const admin = useAdminGate();
  const bills = useBillsStore((s) => s.items);
  const addBill = useBillsStore((s) => s.add);
  const updateBill = useBillsStore((s) => s.update);
  const removeBill = useBillsStore((s) => s.remove);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [error, setError] = useState('');

  const today = todayLocalDate();
  const active = bills.filter((b) => b.active);

  const summary = useMemo(() => {
    const monthly = active.reduce((sum, b) => sum + monthlyCost(b), 0);
    const in30 = plusDays(today, 30);
    const upcoming = active
      .flatMap((b) => dueDates(b, today, in30).map((date) => ({ b, date })))
      .sort((x, y) => x.date.localeCompare(y.date));
    const overdue = active.filter((b) => isOverdue(b, today)).map((b) => ({ b, date: previousDue(b, today) ?? today }));
    const renewals = active
      .filter((b) => b.cadence === 'yearly')
      .map((b) => ({ b, date: nextDue(b, today) }))
      .filter((r) => daysUntil(r.date, today) <= 60)
      .sort((x, y) => x.date.localeCompare(y.date));
    const next14 = upcoming.filter((u) => daysUntil(u.date, today) <= 14).reduce((s, u) => s + Number(u.b.amount), 0);
    return { monthly, upcoming, overdue, renewals, next14, autopay: active.filter((b) => b.autopay).length };
  }, [active, today]);

  if (!admin.isAdmin) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-6">
        <Lock size={56} className="text-gray-500" />
        <div>
          <h2 className="text-3xl font-bold">Money</h2>
          <p className="text-gray-400 mt-2">Bills and subscriptions are for parents. Unlock with the admin password.</p>
        </div>
        {admin.showPrompt ? (
          <form onSubmit={admin.submit} className="flex gap-2">
            <input
              type="password"
              autoFocus
              value={admin.passwordInput}
              onChange={(e) => admin.setPasswordInput(e.target.value)}
              className="bg-white/10 rounded-2xl px-4 py-3 outline-none border border-white/10 focus:border-blue-500"
              placeholder="Admin password"
            />
            <button className="px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold">Unlock</button>
          </form>
        ) : (
          <button onClick={admin.requestToggle} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold">
            Unlock
          </button>
        )}
      </div>
    );
  }

  const save = async () => {
    if (!editing) return;
    const d = editing.draft;
    if (!d.name.trim() || !(Number(d.amount) >= 0) || !d.anchor_date) {
      setError('A bill needs a name, an amount and a due date.');
      return;
    }
    if (/\b\d{12,19}\b/.test(d.pay_from.replace(/[\s-]/g, ''))) {
      setError('Keep full card or account numbers out of the app. "Chase card ending 1234" is enough.');
      return;
    }
    try {
      const row = { ...d, name: d.name.trim(), amount: Number(d.amount) };
      if (editing.id) await updateBill(editing.id, row);
      else await addBill(row);
      setEditing(null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That didn’t save.');
    }
  };
  const markPaid = (b: Bill, date: string) => void updateBill(b.id, { last_paid: date });

  const byCategory = BILL_CATEGORIES.map((c) => ({ c, list: bills.filter((b) => (BILL_CATEGORIES.includes(b.category) ? b.category : 'Other') === c) })).filter((g) => g.list.length);

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-4xl font-bold">Money</h2>
        <div className="flex gap-3">
          <button onClick={() => setEditing({ id: null, draft: { ...EMPTY, anchor_date: today } })} className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold flex items-center gap-2">
            <Plus size={20} /> Bill or subscription
          </button>
          <button onClick={admin.requestToggle} className="px-4 py-3 rounded-2xl bg-red-500/20 text-red-300 font-bold flex items-center gap-2">
            <Lock size={18} /> Lock
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['Per month', money(summary.monthly), 'all bills, averaged'],
          ['Next 14 days', money(summary.next14), `${summary.upcoming.filter((u) => daysUntil(u.date, today) <= 14).length} payments`],
          ['On autopay', `${summary.autopay} of ${active.length}`, 'bills pay themselves'],
          ['Needs attention', String(summary.overdue.length + summary.renewals.length), 'overdue or renewing soon'],
        ].map(([label, value, sub]) => (
          <div key={label} className="glass rounded-3xl p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
            <p className="text-3xl font-bold mt-2 tabular-nums">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {(summary.overdue.length > 0 || summary.renewals.length > 0) && (
        <div className="glass rounded-3xl p-6 border border-amber-500/30">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-4"><AlertTriangle className="text-amber-400" size={22} /> Needs attention</h3>
          <div className="space-y-2">
            {summary.overdue.map(({ b, date }) => (
              <div key={`o-${b.id}`} className="flex items-center gap-4 p-3 rounded-2xl bg-red-500/10">
                <span className="text-red-300 font-bold w-28 shrink-0">Overdue</span>
                <span className="flex-1 font-semibold">{b.name} · due {prettyDate(date)}</span>
                <span className="tabular-nums font-bold">{money(Number(b.amount))}</span>
                <button onClick={() => markPaid(b, date)} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold">Mark paid</button>
              </div>
            ))}
            {summary.renewals.map(({ b, date }) => (
              <div key={`r-${b.id}`} className="flex items-center gap-4 p-3 rounded-2xl bg-amber-500/10">
                <span className="text-amber-300 font-bold w-28 shrink-0">Renews</span>
                <span className="flex-1 font-semibold">{b.name} · {prettyDate(date)} ({daysUntil(date, today)} days)</span>
                <span className="tabular-nums font-bold">{money(Number(b.amount))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-3xl p-6">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-4"><CalendarClock size={22} className="text-blue-400" /> Coming up (30 days)</h3>
        {summary.upcoming.length === 0 ? (
          <p className="text-gray-500 italic">Nothing due in the next 30 days. Add your bills and subscriptions to see them here.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {summary.upcoming.map(({ b, date }) => {
              const paid = !!b.last_paid && b.last_paid >= date;
              return (
                <div key={`${b.id}-${date}`} className="flex items-center gap-4 py-3">
                  <span className="w-32 shrink-0 text-gray-300 font-semibold">{daysUntil(date, today) === 0 ? 'Today' : prettyDate(date)}</span>
                  <span className="flex-1 font-semibold min-w-0 truncate">{b.name}</span>
                  {b.autopay ? (
                    <span className="text-xs font-bold uppercase tracking-wider text-green-300 bg-green-500/10 px-2 py-1 rounded-lg flex items-center gap-1"><Repeat size={12} /> Autopay</span>
                  ) : paid ? (
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Paid</span>
                  ) : (
                    <button onClick={() => markPaid(b, date)} className="text-sm px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold">Mark paid</button>
                  )}
                  <span className="w-24 text-right tabular-nums font-bold">{money(Number(b.amount))}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {byCategory.map(({ c, list }) => (
        <div key={c}>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-[0.3em] mb-3 ml-2">{c}</h4>
          <div className="grid gap-2">
            {list.map((b) => (
              <button
                key={b.id}
                onClick={() => setEditing({ id: b.id, draft: { ...EMPTY, ...b } })}
                className={`w-full text-left flex items-center gap-4 bg-white/5 hover:bg-white/10 rounded-2xl p-4 ${b.active ? '' : 'opacity-50'}`}
              >
                <span className="flex-1 min-w-0">
                  <span className="font-bold text-lg block truncate">{b.name}</span>
                  <span className="text-sm text-gray-400">
                    {b.cadence} · next {prettyDate(nextDue(b, today))}
                    {b.pay_from && ` · ${b.pay_from}`}
                    {b.account_email && ` · ${b.account_email}`}
                  </span>
                </span>
                {b.autopay && <Repeat size={18} className="text-green-400 shrink-0" aria-label="Autopay" />}
                <span className="text-right shrink-0">
                  <span className="block font-bold tabular-nums">{money(Number(b.amount))}</span>
                  <span className="text-xs text-gray-500 tabular-nums">{money(monthlyCost(b))}/mo</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Bill">
          <div className="glass rounded-3xl p-6 w-full max-w-xl max-h-[92vh] overflow-y-auto border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">{editing.id ? 'Edit bill' : 'New bill or subscription'}</h3>
              <button onClick={() => setEditing(null)} aria-label="Close" className="p-2 rounded-xl hover:bg-white/10"><X size={22} /></button>
            </div>
            {(() => {
              const d = editing.draft;
              const setD = (patch: Partial<Draft>) => setEditing({ ...editing, draft: { ...d, ...patch } });
              const field = 'w-full bg-white/10 rounded-2xl p-3 outline-none border border-white/10 focus:border-blue-500';
              const label = 'block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider';
              return (
                <>
                  <label className="block"><span className={label}>Name</span><input autoFocus className={field} value={d.name} onChange={(e) => setD({ name: e.target.value })} placeholder="Netflix, AEP Electric, State Farm…" /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block"><span className={label}>Amount</span><input type="number" inputMode="decimal" step="0.01" min="0" className={field} value={d.amount || ''} onChange={(e) => setD({ amount: Number(e.target.value) })} /></label>
                    <label className="block"><span className={label}>Repeats</span>
                      <select className={`${field} bg-neutral-900`} value={d.cadence} onChange={(e) => setD({ cadence: e.target.value as Cadence })}>
                        {CADENCES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
                      </select>
                    </label>
                    <label className="block"><span className={label}>A due date</span><input type="date" className={field} value={d.anchor_date} onChange={(e) => setD({ anchor_date: e.target.value })} /></label>
                    <label className="block"><span className={label}>Category</span>
                      <select className={`${field} bg-neutral-900`} value={d.category} onChange={(e) => setD({ category: e.target.value })}>
                        {BILL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </label>
                  </div>
                  <label className="flex items-center gap-3 font-semibold"><input type="checkbox" className="w-5 h-5 accent-green-500" checked={d.autopay} onChange={(e) => setD({ autopay: e.target.checked })} /> On autopay</label>
                  <label className="block"><span className={label}>Paid from</span><input className={field} value={d.pay_from} onChange={(e) => setD({ pay_from: e.target.value })} placeholder="Chase card ending 1234" maxLength={60} /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block"><span className={label}>Account email</span><input type="email" className={field} value={d.account_email} onChange={(e) => setD({ account_email: e.target.value })} placeholder="family@…" /></label>
                    <label className="block"><span className={label}>Website</span><input className={field} value={d.website} onChange={(e) => setD({ website: e.target.value })} placeholder="netflix.com" /></label>
                  </div>
                  <label className="block"><span className={label}>Notes</span><input className={field} value={d.notes} onChange={(e) => setD({ notes: e.target.value })} placeholder="Price went up in March" /></label>
                  <p className="text-xs text-gray-500">Logins and passwords belong in your password manager, not here.</p>
                  {editing.id && (
                    <label className="flex items-center gap-3 font-semibold"><input type="checkbox" className="w-5 h-5" checked={!d.active} onChange={(e) => setD({ active: !e.target.checked })} /> Cancelled (keep for the record)</label>
                  )}
                  {error && <p className="text-red-300">{error}</p>}
                  <div className="flex justify-end gap-2 pt-2 flex-wrap">
                    {editing.id && (
                      <button onClick={() => { void removeBill(editing.id!); setEditing(null); }} className="mr-auto px-4 py-3 rounded-xl text-red-300 hover:bg-red-500/10 font-bold">Delete</button>
                    )}
                    <button onClick={() => setEditing(null)} className="px-4 py-3 rounded-xl hover:bg-white/10 font-bold">Cancel</button>
                    <button onClick={() => void save()} className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold">Save</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default MoneyView;
