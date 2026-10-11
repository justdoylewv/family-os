import React, { useMemo, useRef, useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, ShoppingCart, Archive, Mic, Camera, Loader2, X } from 'lucide-react';
import { AISLES } from '../constants';
import { useGroceriesStore } from '../lib/db';
import { aisleFor, splitItems } from '../lib/groceryText';
import { useDictation } from '../lib/speech';
import { authedFetch } from '../lib/auth';

type ScanResult = {
  inFridge: { name: string; amount: string }[];
  alreadyHave: string[];
  suggestions: { name: string; reason: string }[];
};

function shrinkPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(url);
      const s = Math.min(1, 1568 / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * s);
      c.height = Math.round(im.naturalHeight * s);
      c.getContext('2d')?.drawImage(im, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    im.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file isn’t a photo.'));
    };
    im.src = url;
  });
}

const GroceriesView: React.FC = () => {
  const groceries = useGroceriesStore((s) => s.items);
  const addGrocery = useGroceriesStore((s) => s.add);
  const updateGrocery = useGroceriesStore((s) => s.update);
  const removeGroceryItem = useGroceriesStore((s) => s.remove);

  const [draft, setDraft] = useState('');
  const [activeTab, setActiveTab] = useState<'need' | 'have'>('need');
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const [scanShots, setScanShots] = useState<string[]>([]);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle');
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState('');
  const [pickNeed, setPickNeed] = useState<Set<string>>(new Set());
  const [pickHave, setPickHave] = useState<Set<string>>(new Set());

  const say = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice((m) => (m === msg ? '' : m)), 3500);
  };

  /** Adds names to "Need to Buy": pantry items move back, duplicates are skipped. */
  const addNames = async (names: string[]) => {
    const byName = new Map(groceries.map((g) => [g.text.toLowerCase(), g]));
    let added = 0;
    for (const name of names) {
      const hit = byName.get(name.toLowerCase());
      if (hit && !hit.completed) continue;
      if (hit) await updateGrocery(hit.id, { completed: false });
      else await addGrocery({ text: name, aisle: aisleFor(name), completed: false });
      byName.set(name.toLowerCase(), { id: '', text: name, aisle: '', completed: false });
      added++;
    }
    if (!added) say(names.length > 1 ? 'Those are already on the list.' : `${names[0]} is already on the list.`);
    else if (added > 1) say(`Added ${added} items`);
    return added;
  };

  const submit = async (text: string) => {
    const names = splitItems(text);
    if (!names.length) return;
    setDraft('');
    setActiveTab('need');
    await addNames(names);
  };

  const dictation = useDictation({
    onPartial: setDraft,
    onDone: (t) => void submit(t),
    onUnavailable: (reason) => {
      if (reason === 'no-speech') {
        say('I didn’t hear anything. Tap the mic and try again.');
        return;
      }
      inputRef.current?.focus();
      say('Tap the microphone on the keyboard and say what we need.');
    },
  });

  const need = groceries.filter((g) => !g.completed);
  const pantry = groceries.filter((g) => g.completed);
  const displayedItems = activeTab === 'need' ? need : pantry;
  // One-tap re-adds: things the family keeps in the pantry.
  const buyAgain = useMemo(() => pantry.slice(0, 12), [pantry]);

  // ---- fridge scan ----
  const runScan = async (shots: string[]) => {
    setScanState('scanning');
    setScanError('');
    try {
      const res = await authedFetch('/api/scan-fridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: shots, need: need.map((g) => g.text), pantry: pantry.map((g) => g.text) }),
      });
      const data = (await res.json().catch(() => ({}))) as ScanResult & { error?: string };
      if (!res.ok) throw new Error(data.error || 'The fridge check failed.');
      setScan(data);
      setPickNeed(new Set(data.suggestions.map((s) => s.name)));
      setPickHave(new Set(data.alreadyHave));
      setScanState('done');
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'The fridge check failed.');
      setScanState('error');
    }
  };
  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const shot = await shrinkPhoto(file);
      const shots = [...scanShots, shot].slice(-3);
      setScanShots(shots);
      await runScan(shots);
    } catch (err) {
      say(err instanceof Error ? err.message : 'That photo didn’t work.');
    }
  };
  const closeScan = () => {
    setScanState('idle');
    setScan(null);
    setScanShots([]);
  };
  const applyScan = async () => {
    const haveNames = new Set([...pickHave].map((x) => x.toLowerCase()));
    for (const g of need) if (haveNames.has(g.text.toLowerCase())) await updateGrocery(g.id, { completed: true });
    const added = pickNeed.size ? await addNames([...pickNeed]) : 0;
    say([added && `Added ${added}`, pickHave.size && `moved ${pickHave.size} to the pantry`].filter(Boolean).join(', ') || 'No changes');
    closeScan();
  };
  const togglePick = (set: Set<string>, setter: (s: Set<string>) => void, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h2 className="text-2xl md:text-4xl font-bold">Groceries</h2>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => camRef.current?.click()}
            className="px-5 py-2 rounded-2xl flex items-center gap-2 font-bold bg-white/10 hover:bg-white/20 transition-all"
          >
            <Camera size={18} />
            Scan fridge
          </button>
          <div className="flex bg-white/5 rounded-2xl p-1 w-fit shrink-0">
            <button
              onClick={() => setActiveTab('need')}
              className={`px-5 py-2 rounded-xl flex items-center gap-2 font-bold transition-all ${activeTab === 'need' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
            >
              <ShoppingCart size={18} />
              Need to Buy{need.length ? ` (${need.length})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('have')}
              className={`px-5 py-2 rounded-xl flex items-center gap-2 font-bold transition-all ${activeTab === 'have' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
            >
              <Archive size={18} />
              In Pantry
            </button>
          </div>
        </div>
      </div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />

      <form
        className="glass rounded-3xl p-4 flex gap-3 mb-3 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(draft);
        }}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          enterKeyHint="done"
          aria-label="Grocery items"
          className="flex-1 min-w-0 bg-white/5 rounded-2xl px-5 py-4 outline-none border border-white/5 focus:border-blue-500 transition-all text-xl"
          placeholder={dictation.listening ? 'Listening… say “milk, eggs and bread”' : 'Milk, eggs and bread…'}
        />
        <button
          type="button"
          onClick={dictation.toggle}
          aria-label="Say what we need"
          className={`w-16 rounded-2xl flex items-center justify-center shrink-0 transition-all ${dictation.listening ? 'bg-red-600 animate-pulse' : 'bg-white/10 hover:bg-white/20'}`}
        >
          <Mic size={26} />
        </button>
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Add"
          className="bg-blue-600 px-6 rounded-2xl hover:bg-blue-500 disabled:bg-gray-700 disabled:opacity-50 transition-transform active:scale-95 shrink-0 flex items-center justify-center"
        >
          <Plus size={30} />
        </button>
      </form>

      {buyAgain.length > 0 && activeTab === 'need' && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4" aria-label="Buy again">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest self-center shrink-0 mr-1">Buy again</span>
          {buyAgain.map((g) => (
            <button
              key={g.id}
              onClick={() => void updateGrocery(g.id, { completed: false })}
              className="shrink-0 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold"
            >
              <span className="text-blue-400 mr-1">+</span>
              {g.text}
            </button>
          ))}
        </div>
      )}

      {notice && <p className="text-sm text-blue-300 font-semibold mb-3 ml-2" role="status">{notice}</p>}

      <div className="flex-1 overflow-y-auto space-y-6 md:pr-4">
        {AISLES.map((aisle) => {
          const items = displayedItems.filter((g) => (AISLES.includes(g.aisle) ? g.aisle : 'Other') === aisle);
          if (items.length === 0) return null;
          return (
            <div key={aisle}>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-[0.3em] mb-4 ml-2">{aisle}</h4>
              <div className="grid gap-3">
                {items.map((item) => (
                  <div key={item.id} className="w-full flex items-center justify-between bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-transparent hover:border-white/10">
                    <button
                      onClick={() => void updateGrocery(item.id, { completed: !item.completed })}
                      className="flex-1 flex items-center gap-5 p-4 text-left"
                    >
                      {item.completed ? <CheckCircle2 className="text-green-500 shrink-0" size={28} /> : <Circle className="text-blue-500 shrink-0" size={28} />}
                      <span className={`text-xl font-medium ${item.completed ? 'text-green-100' : 'text-white'}`}>{item.text}</span>
                    </button>
                    <button
                      onClick={() => void removeGroceryItem(item.id)}
                      aria-label={`Delete ${item.text}`}
                      className="p-3 mr-2 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors shrink-0"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {displayedItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-600 opacity-50">
            {activeTab === 'need' ? (
              <>
                <ShoppingCart className="mb-4" size={64} />
                <p className="text-xl italic">You don't need anything yet.</p>
              </>
            ) : (
              <>
                <Archive className="mb-4" size={64} />
                <p className="text-xl italic">Your pantry is empty!</p>
              </>
            )}
          </div>
        )}
      </div>

      {scanState !== 'idle' && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Fridge check">
          <div className="glass rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold">Fridge check</h3>
              <button onClick={closeScan} aria-label="Close" className="p-2 rounded-xl hover:bg-white/10">
                <X size={22} />
              </button>
            </div>
            {scanState === 'scanning' && (
              <>
                {scanShots.length > 0 && <img src={scanShots[scanShots.length - 1]} alt="Fridge photo" className="w-full max-h-56 object-cover rounded-2xl" />}
                <p className="flex items-center gap-3 mt-4 text-gray-300 font-semibold">
                  <Loader2 className="animate-spin" size={22} />
                  Looking in the fridge and comparing with the list…
                </p>
              </>
            )}
            {scanState === 'error' && (
              <>
                <p className="text-red-300 mb-4">{scanError}</p>
                <div className="flex justify-end gap-2">
                  <button onClick={closeScan} className="px-4 py-2 rounded-xl hover:bg-white/10 font-bold">Close</button>
                  <button onClick={() => { setScanShots([]); camRef.current?.click(); }} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold">Try another photo</button>
                </div>
              </>
            )}
            {scanState === 'done' && scan && (
              <>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Add to the list ({scan.suggestions.length})</h4>
                {scan.suggestions.length === 0 && <p className="text-gray-500 italic mb-2">Nothing looks low.</p>}
                {scan.suggestions.map((s) => (
                  <label key={s.name} className="flex items-center gap-3 py-3 border-b border-white/10 text-lg">
                    <input type="checkbox" className="w-6 h-6 accent-blue-500" checked={pickNeed.has(s.name)} onChange={() => togglePick(pickNeed, setPickNeed, s.name)} />
                    <span className="font-semibold">{s.name}</span>
                    <span className="ml-auto text-sm text-gray-400">{s.reason}</span>
                  </label>
                ))}
                {scan.alreadyHave.length > 0 && (
                  <>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-5 mb-2">Already have, move to the pantry ({scan.alreadyHave.length})</h4>
                    {scan.alreadyHave.map((n) => (
                      <label key={n} className="flex items-center gap-3 py-3 border-b border-white/10 text-lg">
                        <input type="checkbox" className="w-6 h-6 accent-green-500" checked={pickHave.has(n)} onChange={() => togglePick(pickHave, setPickHave, n)} />
                        <span className="font-semibold">{n}</span>
                        <span className="ml-auto text-sm text-gray-400">in the fridge</span>
                      </label>
                    ))}
                  </>
                )}
                {scan.inFridge.length > 0 && (
                  <>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-5 mb-2">Seen in the photo</h4>
                    <div className="flex flex-wrap gap-2">
                      {scan.inFridge.map((f) => (
                        <span key={f.name} className={`px-2 py-1 rounded-lg bg-white/5 text-sm ${f.amount === 'low' || f.amount === 'almost out' ? 'text-orange-300 font-bold' : 'text-gray-300'}`}>
                          {f.name} · {f.amount}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                <div className="flex justify-end gap-2 mt-6 flex-wrap">
                  <button onClick={() => camRef.current?.click()} className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold">+ Another shelf</button>
                  <button onClick={closeScan} className="px-4 py-3 rounded-xl hover:bg-white/10 font-bold">Cancel</button>
                  <button onClick={() => void applyScan()} className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold">Update list</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroceriesView;
