import React, { useState } from 'react';
import { Loader2, LogOut, Maximize2, Minimize2 } from 'lucide-react';
import { NAV_ITEMS } from './constants';
import type { View } from './types';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import GroceriesView from './components/GroceriesView';
import ChoresView from './components/ChoresView';
import MealsView from './components/MealsView';
import InfoHub from './components/InfoHub';
import MembersView from './components/MembersView';
import LoginGate from './components/LoginGate';
import { supabaseConfigured } from './lib/supabase';
import { signOut, useSession } from './lib/auth';
import { useBootstrapStores } from './lib/db';
import { useFullscreen, useWakeLock } from './lib/kiosk';

const App: React.FC = () => {
  const { session, loading } = useSession();

  if (supabaseConfigured && loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin text-gray-500" size={32} />
      </div>
    );
  }

  if (supabaseConfigured && !session) {
    return <LoginGate />;
  }

  return <FamilyOS />;
};

const FamilyOS: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  useBootstrapStores();
  const fullscreen = useFullscreen();
  useWakeLock(true);

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'calendar':
        return <CalendarView />;
      case 'groceries':
        return <GroceriesView />;
      case 'chores':
        return <ChoresView />;
      case 'meals':
        return <MealsView />;
      case 'members':
        return <MembersView />;
      case 'info':
        return <InfoHub />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-white p-4 gap-4">
      <nav className="w-24 md:w-32 flex flex-col items-center glass rounded-3xl py-8 space-y-4">
        <div className="mb-2 flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="font-bold text-xl">F</span>
          </div>
          <span className="text-[9px] font-mono text-gray-600 tracking-tight" title={__APP_COMMIT__}>
            {__APP_VERSION__}
            {__APP_COMMIT__ && ` · ${__APP_COMMIT__.slice(0, 7)}`}
          </span>
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
            <span className="text-[10px] font-medium uppercase tracking-wider text-center leading-tight">
              {item.label}
            </span>
          </button>
        ))}
        <button
          onClick={() => void fullscreen.toggle()}
          className="mt-auto p-4 rounded-2xl text-gray-500 hover:text-white hover:bg-white/5 transition-all flex flex-col items-center gap-2 w-20"
          title={fullscreen.isFullscreen ? 'Exit full screen' : 'Kiosk mode'}
        >
          {fullscreen.isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
          <span className="text-[10px] font-medium uppercase tracking-wider">
            {fullscreen.isFullscreen ? 'Exit' : 'Kiosk'}
          </span>
        </button>
        {supabaseConfigured && (
          <button
            onClick={() => signOut()}
            className="p-4 rounded-2xl text-gray-500 hover:text-white hover:bg-white/5 transition-all flex flex-col items-center gap-2 w-20"
            title="Sign out"
          >
            <LogOut size={22} />
            <span className="text-[10px] font-medium uppercase tracking-wider">Lock</span>
          </button>
        )}
      </nav>

      <main className="flex-1 glass rounded-3xl overflow-hidden relative">
        <div className="h-full w-full overflow-y-auto p-8">{renderContent()}</div>
      </main>
    </div>
  );
};

export default App;
