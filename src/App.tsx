import React, { useRef, useState } from 'react';
import { Images, Loader2, LogOut, Maximize2, Menu, Minimize2 } from 'lucide-react';
import { NAV_ITEMS } from './constants';
import type { View } from './types';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import GroceriesView from './components/GroceriesView';
import ChoresView from './components/ChoresView';
import MealsView from './components/MealsView';
import InfoHub from './components/InfoHub';
import MembersView from './components/MembersView';
import BoardView from './components/BoardView';
import MoneyView from './components/MoneyView';
import IdleSlideshow from './components/IdleSlideshow';
import LoginGate from './components/LoginGate';
import { supabaseConfigured } from './lib/supabase';
import { signOut, useSession } from './lib/auth';
import { useBootstrapStores } from './lib/db';
import { useFullscreen, useWakeLock } from './lib/kiosk';
import { useGoogleCalendarSync } from './lib/googleCalendar';

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
  const [moreOpen, setMoreOpen] = useState(false);
  useBootstrapStores();
  useGoogleCalendarSync();
  const startSlideshow = useRef<(() => void) | null>(null);
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
      case 'board':
        return <BoardView />;
      case 'money':
        return <MoneyView />;
      case 'info':
        return <InfoHub />;
      default:
        return <Dashboard />;
    }
  };

  const go = (v: View) => {
    setActiveView(v);
    setMoreOpen(false);
  };
  const extras = (
    <>
      <button
        onClick={() => {
          setMoreOpen(false);
          startSlideshow.current?.();
        }}
        className={extraBtn}
        title="Family photos"
      >
        <Images size={22} />
        <span className="text-[10px] font-medium uppercase tracking-wider">Photos</span>
      </button>
      <button
        onClick={() => void fullscreen.toggle()}
        className={extraBtn}
        title={fullscreen.isFullscreen ? 'Exit full screen' : 'Kiosk mode'}
      >
        {fullscreen.isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
        <span className="text-[10px] font-medium uppercase tracking-wider">{fullscreen.isFullscreen ? 'Exit' : 'Kiosk'}</span>
      </button>
      {supabaseConfigured && (
        <button onClick={() => signOut()} className={extraBtn} title="Sign out">
          <LogOut size={22} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Lock</span>
        </button>
      )}
    </>
  );
  const inMore = !MOBILE_TABS.includes(activeView);

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-black text-white md:p-4 gap-4">
      {/* Tablet and desktop: side rail */}
      <nav className="hidden md:flex w-32 flex-col items-center glass rounded-3xl py-5 space-y-1.5 overflow-y-auto">
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
            onClick={() => go(item.id)}
            className={`p-3 rounded-2xl transition-all duration-200 flex flex-col items-center gap-1.5 w-20 shrink-0 ${
              activeView === item.id ? 'glass-active text-blue-400 shadow-inner' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-medium uppercase tracking-wider text-center leading-tight">{item.label}</span>
          </button>
        ))}
        <div className="mt-auto flex flex-col items-center space-y-1.5">{extras}</div>
      </nav>

      <main className="flex-1 min-w-0 md:glass md:rounded-3xl overflow-hidden relative">
        <div className="h-full w-full overflow-y-auto overflow-x-hidden px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)] md:p-8">
          {renderContent()}
        </div>
      </main>

      {/* Phones: bottom tab bar + "More" sheet */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-neutral-950/95 backdrop-blur border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {NAV_ITEMS.filter((i) => MOBILE_TABS.includes(i.id)).map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={`flex flex-col items-center gap-1 py-2.5 [&_svg]:w-6 [&_svg]:h-6 ${activeView === item.id ? 'text-blue-400' : 'text-gray-400'}`}
            >
              {item.icon}
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={`flex flex-col items-center gap-1 py-2.5 ${inMore || moreOpen ? 'text-blue-400' : 'text-gray-400'}`}
            aria-expanded={moreOpen}
          >
            <Menu size={24} />
            <span className="text-[10px] font-semibold">More</span>
          </button>
        </div>
      </nav>
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/60" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] mx-3 glass rounded-3xl p-4 grid grid-cols-4 gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_ITEMS.filter((i) => !MOBILE_TABS.includes(i.id)).map((item) => (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl [&_svg]:w-6 [&_svg]:h-6 ${activeView === item.id ? 'bg-white/10 text-blue-400' : 'text-gray-300'}`}
              >
                {item.icon}
                <span className="text-[11px] font-semibold">{item.label}</span>
              </button>
            ))}
            {extras}
          </div>
        </div>
      )}
      <IdleSlideshow startRef={startSlideshow} />
    </div>
  );
};

// Phones show these four as tabs; everything else lives under "More".
const MOBILE_TABS: View[] = ['dashboard', 'calendar', 'groceries', 'board'];
const extraBtn =
  'shrink-0 p-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 transition-all flex flex-col items-center gap-1.5 md:w-20';

export default App;
