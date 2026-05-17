
import React, { useState, useEffect } from 'react';
import { CalendarEvent, MealPlan, Member } from '../types';
import { Cloud, Clock, Utensils, Edit3, Trophy } from 'lucide-react';

interface Props {
  events: CalendarEvent[];
  meals: MealPlan[];
  quickNote: string;
  setQuickNote: (note: string) => void;
  members: Member[];
}

const Dashboard: React.FC<Props> = ({ events, meals, quickNote, setQuickNote, members }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sortedMembers = [...members].sort((a, b) => b.points - a.points);
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaysMeals = meals.find(m => m.day === todayStr);
  const todaysEvents = events.filter(e => e.date === new Date().toISOString().split('T')[0]).slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full pb-8">
      {/* At a Glance */}
      <div className="glass rounded-3xl p-6 flex flex-col justify-between shadow-xl min-h-[220px]">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-4xl font-bold">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h2>
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

      {/* Leaderboard (Gamified Chores) */}
      <div className="glass rounded-3xl p-6 flex flex-col shadow-xl min-h-[220px]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="text-yellow-500" />
            <h3 className="text-xl font-bold tracking-tight">Family Standings</h3>
          </div>
        </div>
        <div className="space-y-3">
          {sortedMembers.map((member, idx) => (
            <div key={member.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${member.avatarColor} flex items-center justify-center font-bold text-sm shadow-lg`}>
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

      {/* Dinner Tonight */}
      <div className="glass rounded-3xl p-6 flex flex-col justify-between shadow-xl min-h-[220px]">
        <div className="flex items-center gap-3 mb-4">
          <Utensils className="text-pink-400" />
          <h3 className="text-xl font-bold tracking-tight">Dinner</h3>
        </div>
        <div className="bg-gradient-to-br from-pink-500/20 to-orange-500/20 p-6 rounded-2xl border border-pink-500/20 flex-1 flex flex-col justify-center items-center text-center">
          <p className="text-2xl font-bold text-white mb-1">
            {todaysMeals?.dinner || "Not decided yet"}
          </p>
          <p className="text-pink-400 text-sm">Tap Meal Planner to edit</p>
        </div>
      </div>

      {/* Today's Focus */}
      <div className="glass rounded-3xl p-6 flex flex-col shadow-xl md:col-span-2 lg:col-span-1 min-h-[220px]">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="text-orange-400" />
          <h3 className="text-xl font-bold tracking-tight">Today's Focus</h3>
        </div>
        <div className="space-y-3">
          {todaysEvents.length > 0 ? todaysEvents.map(event => (
            <div key={event.id} className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
              <div className={`w-1.5 h-8 rounded-full ${
                event.category === 'Kids' ? 'bg-green-500' : 
                event.category === 'Work' ? 'bg-purple-500' : 'bg-blue-500'
              }`}></div>
              <div>
                <p className="font-semibold leading-none mb-1">{event.title}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold">{event.category}</p>
              </div>
            </div>
          )) : (
            <div className="text-gray-500 italic py-4">No events scheduled.</div>
          )}
        </div>
      </div>

      {/* Quick Notes */}
      <div className="glass rounded-3xl p-6 flex flex-col md:col-span-2 lg:col-span-2 shadow-xl min-h-[220px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Edit3 className="text-yellow-400" />
            <h3 className="text-xl font-bold tracking-tight">Family Scratchpad</h3>
          </div>
          <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">Digital Sticky Note</span>
        </div>
        <textarea
          value={quickNote}
          onChange={(e) => setQuickNote(e.target.value)}
          className="flex-1 bg-white/5 rounded-2xl p-6 text-xl text-yellow-100/80 outline-none focus:ring-2 ring-yellow-500/30 resize-none font-medium placeholder:text-gray-700 shadow-inner"
          placeholder="Leave a message for the family..."
        />
      </div>
    </div>
  );
};

export default Dashboard;
