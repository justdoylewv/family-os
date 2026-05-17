import React, { useEffect, useState } from 'react';
import { Cloud, Clock, Utensils, Edit3, Trophy } from 'lucide-react';
import {
  useEventsStore,
  useMealsStore,
  useMembersStore,
  useSettingsStore,
  todayLocalDate,
} from '../lib/db';

const SCRATCHPAD_KEY = 'scratchpad';

const Dashboard: React.FC = () => {
  const events = useEventsStore((s) => s.items);
  const meals = useMealsStore((s) => s.items);
  const members = useMembersStore((s) => s.items);
  const scratchpad = useSettingsStore((s) => s.values[SCRATCHPAD_KEY] ?? '');
  const setSetting = useSettingsStore((s) => s.set);

  const [time, setTime] = useState(new Date());
  const [draft, setDraft] = useState(scratchpad);

  useEffect(() => {
    const tick = () => setTime(new Date());
    tick();
    const ms = 60_000 - (Date.now() % 60_000);
    const timeout = setTimeout(() => {
      tick();
      const interval = setInterval(tick, 60_000);
      return () => clearInterval(interval);
    }, ms);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    setDraft(scratchpad);
  }, [scratchpad]);

  useEffect(() => {
    if (draft === scratchpad) return;
    const handle = setTimeout(() => {
      void setSetting(SCRATCHPAD_KEY, draft);
    }, 500);
    return () => clearTimeout(handle);
  }, [draft, scratchpad, setSetting]);

  const sortedMembers = [...members].sort((a, b) => b.points - a.points);
  const todayWeekday = time.toLocaleDateString('en-US', { weekday: 'long' });
  const todaysMeal = meals.find((m) => m.day === todayWeekday);
  const today = todayLocalDate();
  const todaysEvents = events.filter((e) => e.date === today).slice(0, 3);
  const memberById = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full pb-8">
      <div className="glass rounded-3xl p-6 flex flex-col justify-between shadow-xl min-h-[220px]">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-4xl font-bold">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </h2>
            <p className="text-gray-400 font-medium mt-1">
              {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-2xl">
              <Cloud />
              72°F
            </div>
            <p className="text-gray-400 text-sm">Sunny • Palo Alto</p>
          </div>
        </div>
        <div className="mt-8 flex gap-2">
          <div className="h-2 w-12 bg-blue-500 rounded-full"></div>
          <div className="h-2 w-8 bg-white/20 rounded-full"></div>
          <div className="h-2 w-8 bg-white/20 rounded-full"></div>
        </div>
      </div>

      <div className="glass rounded-3xl p-6 flex flex-col shadow-xl min-h-[220px]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="text-yellow-500" />
            <h3 className="text-xl font-bold tracking-tight">Family Standings</h3>
          </div>
        </div>
        <div className="space-y-3">
          {sortedMembers.length === 0 && (
            <p className="text-gray-500 italic">Add family members in Chores to get started.</p>
          )}
          {sortedMembers.map((member, idx) => (
            <div key={member.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${member.avatar_color} flex items-center justify-center font-bold text-sm shadow-lg`}>
                  {member.name[0]}
                </div>
                <span className="font-semibold">{member.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-500 font-bold">{member.points}</span>
                <span className="text-xs text-gray-500 uppercase">pts</span>
                {idx === 0 && <span className="text-lg">👑</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-3xl p-6 flex flex-col justify-between shadow-xl min-h-[220px]">
        <div className="flex items-center gap-3 mb-4">
          <Utensils className="text-pink-400" />
          <h3 className="text-xl font-bold tracking-tight">Dinner</h3>
        </div>
        <div className="bg-gradient-to-br from-pink-500/20 to-orange-500/20 p-6 rounded-2xl border border-pink-500/20 flex-1 flex flex-col justify-center items-center text-center">
          <p className="text-2xl font-bold text-white mb-1">
            {todaysMeal?.dinner || 'Not decided yet'}
          </p>
          <p className="text-pink-400 text-sm">Tap Meal Planner to edit</p>
        </div>
      </div>

      <div className="glass rounded-3xl p-6 flex flex-col shadow-xl md:col-span-2 lg:col-span-1 min-h-[220px]">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="text-orange-400" />
          <h3 className="text-xl font-bold tracking-tight">Today's Focus</h3>
        </div>
        <div className="space-y-3">
          {todaysEvents.length > 0 ? (
            todaysEvents.map((event) => {
              const member = event.assigned_to_member_id
                ? memberById.get(event.assigned_to_member_id)
                : undefined;
              const color = member?.avatar_color ?? 'bg-blue-500';
              return (
                <div key={event.id} className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
                  <div className={`w-1.5 h-8 rounded-full ${color}`}></div>
                  <div>
                    <p className="font-semibold leading-none mb-1">{event.title}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">
                      {member ? member.name : event.category}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-gray-500 italic py-4">No events scheduled.</div>
          )}
        </div>
      </div>

      <div className="glass rounded-3xl p-6 flex flex-col md:col-span-2 lg:col-span-2 shadow-xl min-h-[220px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Edit3 className="text-yellow-400" />
            <h3 className="text-xl font-bold tracking-tight">Family Scratchpad</h3>
          </div>
          <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">Digital Sticky Note</span>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 bg-white/5 rounded-2xl p-6 text-xl text-yellow-100/80 outline-none focus:ring-2 ring-yellow-500/30 resize-none font-medium placeholder:text-gray-700 shadow-inner"
          placeholder="Leave a message for the family…"
        />
      </div>
    </div>
  );
};

export default Dashboard;
