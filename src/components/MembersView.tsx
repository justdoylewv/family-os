import React, { useState } from 'react';
import { Lock, Unlock, Plus, Trash2, Users } from 'lucide-react';
import { useMembersStore, nextMemberColor } from '../lib/db';
import { useAdminGate } from '../lib/admin';
import { MEMBER_COLORS } from '../constants';

const MembersView: React.FC = () => {
  const members = useMembersStore((s) => s.items);
  const addMember = useMembersStore((s) => s.add);
  const updateMember = useMembersStore((s) => s.update);
  const removeMember = useMembersStore((s) => s.remove);

  const admin = useAdminGate();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string>(() => nextMemberColor(members));

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    await addMember({ name, points: 0, avatar_color: newColor });
    setNewName('');
    setNewColor(nextMemberColor([...members, { avatar_color: newColor }]));
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Users className="text-blue-400" size={32} />
          <h2 className="text-3xl font-bold">Family</h2>
        </div>
        <button
          onClick={admin.requestToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${admin.isAdmin ? 'bg-red-500/20 text-red-400' : 'bg-white/10 hover:bg-white/20'}`}
        >
          {admin.isAdmin ? <Unlock size={18} /> : <Lock size={18} />}
          {admin.isAdmin ? 'Admin Mode' : 'Enter Admin Mode'}
        </button>
      </div>

      {admin.showPrompt && (
        <div className="absolute top-16 right-0 z-20 glass p-4 rounded-2xl shadow-2xl border border-white/20 w-72">
          <form onSubmit={admin.submit} className="flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-300">Enter Admin Password:</p>
            <input
              type="password"
              value={admin.passwordInput}
              onChange={(e) => admin.setPasswordInput(e.target.value)}
              className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 text-sm mt-1">
              <button type="button" onClick={admin.cancel} className="px-3 py-1.5 hover:bg-white/10 rounded-md">
                Cancel
              </button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-md text-white font-medium">
                Unlock
              </button>
            </div>
          </form>
        </div>
      )}

      {admin.isAdmin && (
        <div className="glass rounded-3xl p-6 mb-8 shadow-xl border-white/10">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Add a family member</p>
          <div className="flex gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Name (e.g. Otto)"
              className="flex-1 bg-white/5 rounded-2xl p-4 outline-none border border-white/10 focus:border-blue-500 text-lg"
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:opacity-50 px-6 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-blue-900/20"
            >
              <Plus size={20} />
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {MEMBER_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewColor(color)}
                aria-label={color}
                className={`w-9 h-9 rounded-full ${color} border-2 transition-all ${newColor === color ? 'border-white scale-110' : 'border-white/10'}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-8">
        {members.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 text-center text-gray-500 italic py-12 glass rounded-3xl">
            No family members yet. Tap <strong className="text-gray-300">Enter Admin Mode</strong> to add one.
          </div>
        )}
        {members.map((member) => (
          <div
            key={member.id}
            className="glass rounded-3xl p-6 flex items-center gap-4 shadow-xl border-white/5 group"
          >
            <div className={`w-16 h-16 rounded-2xl ${member.avatar_color} flex items-center justify-center font-bold text-2xl shadow-lg shrink-0`}>
              {member.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {admin.isAdmin ? (
                <input
                  value={member.name}
                  onChange={(e) => updateMember(member.id, { name: e.target.value })}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-lg text-white w-full outline-none focus:border-blue-500"
                />
              ) : (
                <p className="text-xl font-bold leading-tight truncate">{member.name}</p>
              )}
              <p className="text-yellow-500 text-sm font-bold mt-1">
                {member.points} pts
                <span className="text-gray-500 ml-2 font-normal">
                  Level {Math.floor(member.points / 100) + 1}
                </span>
              </p>
            </div>
            {admin.isAdmin && (
              <button
                onClick={() => removeMember(member.id)}
                className="p-3 text-red-400 hover:bg-red-500/20 rounded-xl transition-all shrink-0"
                title="Remove"
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MembersView;
