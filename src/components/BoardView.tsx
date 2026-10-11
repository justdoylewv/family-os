import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Plus, X, Eraser } from 'lucide-react';
import { useMembersStore, useNotesStore } from '../lib/db';

const NOTE_COLORS: Record<string, string> = {
  yellow: 'bg-yellow-200',
  pink: 'bg-pink-200',
  blue: 'bg-sky-200',
  green: 'bg-emerald-200',
};
const PENS = ['#111827', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];

const BoardView: React.FC = () => {
  const notes = useNotesStore((s) => s.items);
  const addNote = useNotesStore((s) => s.add);
  const removeNote = useNotesStore((s) => s.remove);
  const members = useMembersStore((s) => s.items);
  const memberById = new Map(members.map((m) => [m.id, m]));

  const [mode, setMode] = useState<'none' | 'note' | 'doodle'>('none');
  const [armed, setArmed] = useState<string | null>(null);
  const [error, setError] = useState('');

  const remove = (id: string) => {
    // Two taps to delete: kids poke at wall tablets.
    if (armed !== id) {
      setArmed(id);
      window.setTimeout(() => setArmed((a) => (a === id ? null : a)), 3000);
      return;
    }
    void removeNote(id);
  };

  const post = async (n: Parameters<typeof addNote>[0]) => {
    try {
      await addNote(n);
      setMode('none');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That didn’t post.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h2 className="text-2xl md:text-4xl font-bold">Message Board</h2>
        <div className="flex gap-3">
          <button onClick={() => setMode('doodle')} className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 font-bold flex items-center gap-2">
            <Pencil size={20} /> Doodle
          </button>
          <button onClick={() => setMode('note')} className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold flex items-center gap-2">
            <Plus size={20} /> Note
          </button>
        </div>
      </div>
      {error && <p className="text-red-300 mb-4">{error}</p>}

      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-gray-500 italic text-xl mt-10 text-center">Leave a note or a doodle for the family.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 items-start pb-8">
            {notes.map((n, i) => {
              const who = n.member_id ? memberById.get(n.member_id)?.name : '';
              const tilt = i % 3 === 0 ? '-rotate-1' : i % 3 === 1 ? 'rotate-1' : '';
              return (
                <div
                  key={n.id}
                  className={`relative ${tilt} rounded-sm rounded-br-2xl shadow-lg ${n.kind === 'doodle' ? 'bg-white p-2 pb-8' : `${NOTE_COLORS[n.color] ?? NOTE_COLORS.yellow} p-5 pb-9 min-h-[140px]`} text-gray-900`}
                >
                  {n.kind === 'doodle' && n.image ? (
                    <img src={n.image} alt={`Doodle${who ? ` by ${who}` : ''}`} className="w-full rounded-sm" />
                  ) : (
                    <p className="text-xl font-semibold whitespace-pre-wrap break-words">{n.text}</p>
                  )}
                  {who && <span className="absolute left-4 bottom-2 text-sm font-bold opacity-60">— {who}</span>}
                  <button
                    onClick={() => remove(n.id)}
                    aria-label="Remove"
                    className={`absolute top-1 right-1 rounded-lg px-2 py-1 text-sm font-bold ${armed === n.id ? 'bg-red-600 text-white' : 'text-gray-500 hover:bg-black/10'}`}
                  >
                    {armed === n.id ? 'Remove' : <X size={16} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {mode === 'note' && <NoteDialog members={members} onCancel={() => setMode('none')} onPost={(text, color, member_id) => post({ kind: 'note', text, color, member_id, image: null })} />}
      {mode === 'doodle' && <DoodleDialog members={members} onCancel={() => setMode('none')} onPost={(image, member_id) => post({ kind: 'doodle', text: '', color: 'white', image, member_id })} />}
    </div>
  );
};

type MemberList = ReturnType<typeof useMembersStore.getState>['items'];

const WhoPicker: React.FC<{ members: MemberList; value: string | null; onChange: (id: string | null) => void }> = ({ members, value, onChange }) => (
  <div className="flex gap-2 flex-wrap">
    {members.map((m) => (
      <button
        key={m.id}
        type="button"
        onClick={() => onChange(value === m.id ? null : m.id)}
        className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border ${value === m.id ? 'border-white bg-white/15' : 'border-white/10 bg-white/5'}`}
      >
        <span className={`w-7 h-7 rounded-full ${m.avatar_color} flex items-center justify-center text-sm font-bold`}>{m.name[0]}</span>
        {m.name}
      </button>
    ))}
  </div>
);

const Dialog: React.FC<{ title: string; wide?: boolean; children: React.ReactNode }> = ({ title, wide, children }) => (
  <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
    <div className={`glass rounded-3xl p-6 w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto border border-white/10`}>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      {children}
    </div>
  </div>
);

const NoteDialog: React.FC<{ members: MemberList; onCancel: () => void; onPost: (text: string, color: string, member: string | null) => void }> = ({ members, onCancel, onPost }) => {
  const [text, setText] = useState('');
  const [color, setColor] = useState('yellow');
  const [who, setWho] = useState<string | null>(null);
  return (
    <Dialog title="New note">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={400}
        placeholder="Soccer moved to 5:30 Thursday"
        className="w-full min-h-[120px] bg-white/10 rounded-2xl p-4 text-lg outline-none border border-white/10 focus:border-blue-500"
      />
      <div className="flex gap-3 my-4">
        {Object.entries(NOTE_COLORS).map(([k, cls]) => (
          <button key={k} type="button" aria-label={k} onClick={() => setColor(k)} className={`w-11 h-11 rounded-full ${cls} border-4 ${color === k ? 'border-white' : 'border-transparent'}`} />
        ))}
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">From</p>
      <WhoPicker members={members} value={who} onChange={setWho} />
      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onCancel} className="px-5 py-3 rounded-xl hover:bg-white/10 font-bold">Cancel</button>
        <button onClick={() => text.trim() && onPost(text.trim(), color, who)} disabled={!text.trim()} className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-bold">Post</button>
      </div>
    </Dialog>
  );
};

const DoodleDialog: React.FC<{ members: MemberList; onCancel: () => void; onPost: (image: string, member: string | null) => void }> = ({ members, onCancel, onPost }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pen, setPen] = useState(PENS[0]);
  const [size, setSize] = useState(6);
  const [erasing, setErasing] = useState(false);
  const [drew, setDrew] = useState(false);
  const [who, setWho] = useState<string | null>(null);
  const last = useRef<[number, number] | null>(null);
  const W = 960;
  const H = 600;

  const blank = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    setDrew(false);
  };
  useEffect(blank, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height];
  };
  const stroke = (a: [number, number], b: [number, number], e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const pressure = e.pointerType === 'pen' && e.pressure ? 0.4 + e.pressure : 1;
    const scale = W / e.currentTarget.getBoundingClientRect().width;
    ctx.strokeStyle = erasing ? '#fff' : pen;
    ctx.lineWidth = (erasing ? size * 4 : size) * pressure * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0] + 0.01, b[1]);
    ctx.stroke();
    setDrew(true);
  };
  const save = () => {
    const src = canvasRef.current;
    if (!src || !drew) return;
    const out = document.createElement('canvas');
    out.width = 640;
    out.height = 400;
    out.getContext('2d')?.drawImage(src, 0, 0, 640, 400);
    let img = out.toDataURL('image/png');
    if (img.length > 200000) img = out.toDataURL('image/jpeg', 0.8);
    onPost(img, who);
  };

  return (
    <Dialog title="Doodle" wide>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="w-full max-w-full rounded-2xl bg-white touch-none cursor-crosshair"
        style={{ aspectRatio: '16 / 10' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          last.current = point(e);
          stroke(last.current, last.current, e);
        }}
        onPointerMove={(e) => {
          if (!last.current) return;
          const p = point(e);
          stroke(last.current, p, e);
          last.current = p;
        }}
        onPointerUp={() => (last.current = null)}
        onPointerCancel={() => (last.current = null)}
      />
      <div className="flex items-center gap-3 flex-wrap mt-4">
        {PENS.map((c) => (
          <button
            key={c}
            aria-label="Pen color"
            onClick={() => {
              setPen(c);
              setErasing(false);
            }}
            className={`w-10 h-10 rounded-full border-4 ${pen === c && !erasing ? 'border-white' : 'border-transparent'}`}
            style={{ background: c }}
          />
        ))}
        <div className="flex bg-white/5 rounded-xl p-1">
          {[3, 6, 14].map((s, i) => (
            <button key={s} onClick={() => setSize(s)} className={`px-3 py-2 rounded-lg text-sm font-bold ${size === s ? 'bg-white/20' : 'text-gray-400'}`}>
              {['Thin', 'Medium', 'Thick'][i]}
            </button>
          ))}
        </div>
        <button onClick={() => setErasing(!erasing)} className={`px-3 py-2 rounded-xl font-bold flex items-center gap-2 ${erasing ? 'bg-blue-600' : 'bg-white/10'}`}>
          <Eraser size={18} /> Eraser
        </button>
        <button onClick={blank} className="px-3 py-2 rounded-xl bg-white/10 font-bold">Clear</button>
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-5 mb-2">From</p>
      <WhoPicker members={members} value={who} onChange={setWho} />
      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onCancel} className="px-5 py-3 rounded-xl hover:bg-white/10 font-bold">Cancel</button>
        <button onClick={save} disabled={!drew} className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-bold">Stick it on the board</button>
      </div>
    </Dialog>
  );
};

export default BoardView;
