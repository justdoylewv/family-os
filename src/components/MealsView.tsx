import React, { useState } from 'react';
import { Check, Edit2, Star } from 'lucide-react';
import { useMealsStore } from '../lib/db';

const FAVORITES = ['Tacos', 'Spaghetti', 'Grilled Salmon', 'Stir Fry', 'Pizza', 'Roast Chicken', 'Lentil Soup'];

const MealsView: React.FC = () => {
  const meals = useMealsStore((s) => s.items);
  const setMeal = useMealsStore((s) => s.setMeal);

  const [editing, setEditing] = useState<{ day: string; slot: 'lunch' | 'dinner' } | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (day: string, slot: 'lunch' | 'dinner', current: string) => {
    setEditing({ day, slot });
    setEditValue(current);
  };

  const saveEdit = async () => {
    if (!editing) return;
    await setMeal(editing.day, editing.slot, editValue);
    setEditing(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold">Weekly Meal Planner</h2>
        <div className="flex items-center gap-2 text-yellow-500">
          <Star size={20} fill="currentColor" />
          <span className="font-bold text-sm uppercase tracking-widest">Master Menu</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-8">
        {meals.map((item) => (
          <div
            key={item.day}
            className="glass rounded-3xl p-6 flex flex-col md:flex-row md:items-center gap-6 shadow-lg border border-white/5 transition-all hover:border-white/20"
          >
            <div className="w-40">
              <h3 className="text-2xl font-bold text-blue-400">{item.day}</h3>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => startEdit(item.day, 'lunch', item.lunch)}
                className="bg-white/5 hover:bg-white/10 p-5 rounded-2xl text-left transition-all border border-transparent hover:border-blue-500/50 flex justify-between items-center"
              >
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Lunch</p>
                  <p className={`text-lg ${item.lunch ? 'text-white' : 'text-gray-700 italic'}`}>
                    {item.lunch || 'Add lunch…'}
                  </p>
                </div>
                <Edit2 size={16} className="text-gray-600" />
              </button>

              <button
                onClick={() => startEdit(item.day, 'dinner', item.dinner)}
                className="bg-white/5 hover:bg-white/10 p-5 rounded-2xl text-left transition-all border border-transparent hover:border-pink-500/50 flex justify-between items-center"
              >
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Dinner</p>
                  <p className={`text-lg ${item.dinner ? 'text-white' : 'text-gray-700 italic'}`}>
                    {item.dinner || 'Add dinner…'}
                  </p>
                </div>
                <Edit2 size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-8 w-full max-w-2xl border border-white/20 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-bold">
                {editing.day} <span className="text-blue-500">{editing.slot}</span>
              </h3>
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-8">
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                className="w-full bg-white/10 rounded-3xl p-8 text-4xl font-bold outline-none border border-white/10 focus:ring-4 ring-blue-500/20 text-center"
                placeholder="What's for meal?"
              />

              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">
                  Quick Select Favorites
                </p>
                <div className="flex flex-wrap gap-3">
                  {FAVORITES.map((fav) => (
                    <button
                      key={fav}
                      onClick={() => setEditValue(fav)}
                      className="bg-white/5 hover:bg-blue-600 hover:text-white px-6 py-3 rounded-full border border-white/10 transition-all font-medium"
                    >
                      {fav}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 py-6 rounded-3xl font-bold text-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 py-6 rounded-3xl font-bold text-xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3"
                >
                  <Check size={28} />
                  Update Meal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealsView;
