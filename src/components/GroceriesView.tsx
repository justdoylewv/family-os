import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, ShoppingCart, Archive } from 'lucide-react';
import { AISLES } from '../constants';
import { useGroceriesStore } from '../lib/db';

const GROCERY_DATABASE: Record<string, string[]> = {
  Produce: ['Apples', 'Bananas', 'Carrots', 'Lettuce', 'Tomatoes', 'Onions', 'Garlic', 'Potatoes', 'Broccoli', 'Lemons', 'Berries'],
  Dairy: ['Milk', 'Eggs', 'Butter', 'Cheese', 'Yogurt', 'Sour Cream', 'Cream Cheese'],
  Meat: ['Chicken', 'Ground Beef', 'Pork Chops', 'Bacon', 'Sausage', 'Turkey', 'Deli Meat'],
  Pantry: ['Pasta', 'Rice', 'Canned Beans', 'Tomato Sauce', 'Cereal', 'Peanut Butter', 'Jelly', 'Bread', 'Flour', 'Sugar', 'Olive Oil', 'Coffee', 'Tea'],
  Frozen: ['Pizza', 'Ice Cream', 'Vegetables', 'Waffles', 'Fruit'],
  Household: ['Toilet Paper', 'Paper Towels', 'Dish Soap', 'Laundry Detergent', 'Trash Bags'],
  Other: [],
};

const GroceriesView: React.FC = () => {
  const groceries = useGroceriesStore((s) => s.items);
  const addGrocery = useGroceriesStore((s) => s.add);
  const updateGrocery = useGroceriesStore((s) => s.update);
  const removeGroceryItem = useGroceriesStore((s) => s.remove);

  const [newAisle, setNewAisle] = useState('Produce');
  const [newGrocery, setNewGrocery] = useState('');
  const [activeTab, setActiveTab] = useState<'need' | 'have'>('need');

  const handleAdd = async () => {
    if (!newGrocery) return;
    const existing = groceries.find((g) => g.text.toLowerCase() === newGrocery.toLowerCase());
    if (existing) {
      await updateGrocery(existing.id, { completed: false });
    } else {
      await addGrocery({ text: newGrocery, aisle: newAisle, completed: false });
    }
    setNewGrocery('');
  };

  const toggleGrocery = async (id: string, completed: boolean) => {
    await updateGrocery(id, { completed: !completed });
  };

  const removeGrocery = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeGroceryItem(id);
  };

  const displayedItems = groceries.filter((g) => (activeTab === 'need' ? !g.completed : g.completed));

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-4xl font-bold">Living Inventory</h2>

        <div className="flex bg-white/5 rounded-2xl p-1 w-fit shrink-0">
          <button
            onClick={() => setActiveTab('need')}
            className={`px-6 py-2 rounded-xl flex items-center gap-2 font-bold transition-all ${activeTab === 'need' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
          >
            <ShoppingCart size={18} />
            Need to Buy
          </button>
          <button
            onClick={() => setActiveTab('have')}
            className={`px-6 py-2 rounded-xl flex items-center gap-2 font-bold transition-all ${activeTab === 'have' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
          >
            <Archive size={18} />
            In Pantry
          </button>
        </div>
      </div>

      <div className="glass rounded-3xl p-6 flex gap-4 mb-8 shadow-xl">
        <select
          value={newAisle}
          onChange={(e) => {
            setNewAisle(e.target.value);
            setNewGrocery('');
          }}
          className="bg-neutral-900 rounded-2xl p-5 outline-none border border-white/5 text-gray-300 w-48"
        >
          {AISLES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        {newAisle === 'Other' ? (
          <input
            value={newGrocery}
            onChange={(e) => setNewGrocery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 bg-white/5 rounded-2xl p-5 outline-none border border-white/5 focus:border-blue-500 transition-all text-xl"
            placeholder="Type custom item…"
          />
        ) : (
          <select
            value={newGrocery}
            onChange={(e) => setNewGrocery(e.target.value)}
            className="flex-1 bg-neutral-900 rounded-2xl p-5 outline-none border border-white/5 focus:border-blue-500 transition-all text-xl"
          >
            <option value="" disabled>
              Select {newAisle} item to add…
            </option>
            {(GROCERY_DATABASE[newAisle] || []).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={handleAdd}
          disabled={!newGrocery}
          className="bg-blue-600 px-8 rounded-2xl hover:bg-blue-500 disabled:bg-gray-700 disabled:opacity-50 transition-transform active:scale-95 shrink-0 flex items-center justify-center shadow-lg shadow-blue-900/20"
        >
          <Plus size={32} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-4">
        {AISLES.map((aisle) => {
          const items = displayedItems.filter((g) => g.aisle === aisle);
          if (items.length === 0) return null;
          return (
            <div key={aisle} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-[0.3em] mb-4 ml-2">
                {aisle}
              </h4>
              <div className="grid gap-3">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleGrocery(item.id, item.completed)}
                    className="w-full flex items-center justify-between bg-white/5 p-4 rounded-2xl hover:bg-white/10 transition-all text-left group border border-transparent hover:border-white/10"
                  >
                    <div className="flex items-center gap-5">
                      {item.completed ? (
                        <CheckCircle2 className="text-green-500 shrink-0" size={28} />
                      ) : (
                        <Circle className="text-blue-500 shrink-0" size={28} />
                      )}
                      <span className={`text-xl font-medium ${item.completed ? 'text-green-100' : 'text-white'}`}>
                        {item.text}
                      </span>
                    </div>
                    <div
                      onClick={(e) => removeGrocery(item.id, e)}
                      role="button"
                      tabIndex={0}
                      className="p-3 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors shrink-0"
                    >
                      <Trash2 size={20} />
                    </div>
                  </button>
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
    </div>
  );
};

export default GroceriesView;
