
import React, { useState, useEffect } from 'react';
import { NAV_ITEMS } from './constants';
import { View, CalendarEvent, GroceryItem, TaskItem, MealPlan, Category, Member } from './types';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import GroceriesView from './components/GroceriesView';
import ChoresView from './components/ChoresView';
import MealsView from './components/MealsView';
import InfoHub from './components/InfoHub';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  
  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('family_members');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Otto', points: 45, avatarColor: 'bg-blue-500' },
      { id: '2', name: 'Future Baby', points: 0, avatarColor: 'bg-pink-500' },
      { id: '3', name: 'Dad', points: 120, avatarColor: 'bg-green-500' },
      { id: '4', name: 'Mom', points: 150, avatarColor: 'bg-purple-500' },
    ];
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('family_events');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Soccer Practice', date: new Date().toISOString().split('T')[0], category: Category.KIDS },
      { id: '2', title: 'Dinner with Grandparents', date: new Date().toISOString().split('T')[0], category: Category.FAMILY },
    ];
  });

  const [groceries, setGroceries] = useState<GroceryItem[]>(() => {
    const saved = localStorage.getItem('family_groceries');
    return saved ? JSON.parse(saved) : [
      { id: '1', text: 'Milk', completed: false, aisle: 'Dairy' },
      { id: '2', text: 'Apples', completed: true, aisle: 'Produce' },
    ];
  });

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('family_tasks');
    return saved ? JSON.parse(saved) : [
      { id: '1', text: 'Take out trash', completed: false, assignedTo: 'Otto', points: 10 },
      { id: '2', text: 'Load dishwasher', completed: false, assignedTo: 'Mom', points: 15 },
    ];
  });

  const [meals, setMeals] = useState<MealPlan[]>(() => {
    const saved = localStorage.getItem('family_meals');
    if (saved) return JSON.parse(saved);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days.map(day => ({ day, lunch: '', dinner: '' }));
  });

  const [quickNote, setQuickNote] = useState(() => localStorage.getItem('family_note') || "Dad is napping. Keep it quiet!");

  useEffect(() => localStorage.setItem('family_events', JSON.stringify(events)), [events]);
  useEffect(() => localStorage.setItem('family_groceries', JSON.stringify(groceries)), [groceries]);
  useEffect(() => localStorage.setItem('family_tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('family_meals', JSON.stringify(meals)), [meals]);
  useEffect(() => localStorage.setItem('family_note', quickNote), [quickNote]);
  useEffect(() => localStorage.setItem('family_members', JSON.stringify(members)), [members]);

  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const isNowCompleted = !t.completed;
        if (isNowCompleted && t.assignedTo) {
          setMembers(mPrev => mPrev.map(m => 
            m.name === t.assignedTo ? { ...m, points: m.points + t.points } : m
          ));
        } else if (!isNowCompleted && t.assignedTo) {
          setMembers(mPrev => mPrev.map(m => 
            m.name === t.assignedTo ? { ...m, points: Math.max(0, m.points - t.points) } : m
          ));
        }
        return { ...t, completed: isNowCompleted };
      }
      return t;
    }));
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard events={events} meals={meals} quickNote={quickNote} setQuickNote={setQuickNote} members={members} />;
      case 'calendar':
        return <CalendarView events={events} setEvents={setEvents} />;
      case 'groceries':
        return <GroceriesView groceries={groceries} setGroceries={setGroceries} />;
      case 'chores':
        return <ChoresView tasks={tasks} setTasks={setTasks} members={members} onToggleTask={handleToggleTask} />;
      case 'meals':
        return <MealsView meals={meals} setMeals={setMeals} />;
      case 'info':
        return <InfoHub />;
      default:
        return <Dashboard events={events} meals={meals} quickNote={quickNote} setQuickNote={setQuickNote} members={members} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-white p-4 gap-4">
      <nav className="w-24 md:w-32 flex flex-col items-center glass rounded-3xl py-8 space-y-4">
        <div className="mb-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="font-bold text-xl">F</span>
          </div>
        </div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`p-4 rounded-2xl transition-all duration-200 flex flex-col items-center gap-2 w-20 ${
              activeView === item.id 
                ? 'glass-active text-blue-400 shadow-inner' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-medium uppercase tracking-wider text-center leading-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      <main className="flex-1 glass rounded-3xl overflow-hidden relative">
        <div className="h-full w-full overflow-y-auto p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
