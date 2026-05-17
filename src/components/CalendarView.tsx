import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Mic, Square } from 'lucide-react';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isSameDay,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import { CATEGORY_COLORS, EVENT_CATEGORIES } from '../constants';
import { useEventsStore, useMembersStore, todayLocalDate } from '../lib/db';
import { authedFetch } from '../lib/auth';
import type { CalendarViewMode, EventCategory } from '../types';

const formatDate = (d: Date) => format(d, 'yyyy-MM-dd');

interface NewEventDraft {
  title: string;
  category: EventCategory;
  date: string;
  assigned_to_member_id: string | null;
}

const CalendarView: React.FC = () => {
  const events = useEventsStore((s) => s.items);
  const addEvent = useEventsStore((s) => s.add);
  const addManyEvents = useEventsStore((s) => s.addMany);
  const members = useMembersStore((s) => s.items);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [showModal, setShowModal] = useState(false);
  const [draft, setDraft] = useState<NewEventDraft>({
    title: '',
    category: 'family',
    date: '',
    assigned_to_member_id: null,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const memberById = new Map(members.map((m) => [m.id, m]));

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'OAUTH_AUTH_SUCCESS') return;

      setIsSyncing(true);
      try {
        const res = await authedFetch('/api/calendar/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens: event.data.tokens }),
        });
        const data = await res.json();
        if (data.events) {
          const mapped = (data.events as Array<{ id: string; summary?: string; start?: { date?: string; dateTime?: string } }>)
            .map((ge) => ({
              title: ge.summary || 'Busy',
              date: (ge.start?.date || ge.start?.dateTime)?.split('T')[0] || '',
              category: 'family' as EventCategory,
              google_event_id: ge.id,
              assigned_to_member_id: null,
            }))
            .filter((e) => e.date);
          await addManyEvents(mapped);
          alert(`Synced ${mapped.length} events from Google Calendar`);
        } else if (data.error) {
          alert('Error syncing calendar: ' + data.error);
        }
      } catch (err) {
        console.error('Failed to fetch calendar', err);
        alert('Failed to sync calendar data.');
      } finally {
        setIsSyncing(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [addManyEvents]);

  const handleConnectGoogle = async () => {
    try {
      const redirectUri = `${window.location.origin}/api/auth/google/callback`;
      const response = await authedFetch(`/api/auth/google/url?redirectUri=${encodeURIComponent(redirectUri)}`);
      if (!response.ok) throw new Error('Failed to get auth URL.');
      const { url } = await response.json();
      const authWindow = window.open(url, 'oauth_popup', 'width=600,height=700');
      if (!authWindow) alert('Please allow popups for this site to connect Google Calendar.');
    } catch (err) {
      console.error('OAuth error:', err);
      alert('Failed to start Google sign-in. Check OAuth env vars in Vercel.');
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      mediaRecorder?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      recorder.onstop = async () => {
        setIsSyncing(true);
        const audioBlob = new Blob(audioChunks, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          try {
            const res = await authedFetch('/api/parse-events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioData: base64data, mimeType: audioBlob.type }),
            });
            const data = await res.json();
            if (data.events?.length) {
              const valid = (data.events as Array<{ title: string; date: string; category: string }>)
                .filter((e) => e.title && e.date)
                .map((e) => ({
                  title: e.title,
                  date: e.date,
                  category: (EVENT_CATEGORIES.includes(e.category as EventCategory)
                    ? (e.category as EventCategory)
                    : 'family') as EventCategory,
                  assigned_to_member_id: null,
                }));
              await addManyEvents(valid);
              alert(`Added ${valid.length} events from voice!`);
            }
          } catch (err) {
            console.error(err);
            alert('Failed to parse voice audio.');
          } finally {
            setIsSyncing(false);
            stream.getTracks().forEach((t) => t.stop());
          }
        };
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      alert('Could not access microphone');
      console.error(err);
    }
  };

  const handlePrev = () => {
    if (viewMode === 'day') setCurrentDate(subDays(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };
  const handleNext = () => {
    if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };
  const handleToday = () => setCurrentDate(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });

  const titleText =
    viewMode === 'day'
      ? format(currentDate, 'EEEE, MMMM d')
      : viewMode === 'week'
        ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`
        : format(currentDate, 'MMMM');
  const titleSub = viewMode === 'month' ? format(currentDate, 'yyyy') : format(weekStart, 'yyyy');

  const handleAddEvent = async () => {
    if (!draft.title || !draft.date) return;
    await addEvent({
      title: draft.title,
      date: draft.date,
      category: draft.category,
      assigned_to_member_id: draft.assigned_to_member_id,
    });
    setDraft({ title: '', category: 'family', date: '', assigned_to_member_id: null });
    setShowModal(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-3xl font-bold">
            {titleText} <span className="text-gray-500">{titleSub}</span>
          </h2>
          <div className="flex gap-2">
            <button onClick={handlePrev} className="p-3 glass rounded-xl hover:bg-white/10 transition-colors" aria-label="Previous">
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleToday}
              className="px-4 glass rounded-xl hover:bg-white/10 transition-colors text-sm font-bold uppercase tracking-widest text-gray-300"
            >
              Today
            </button>
            <button onClick={handleNext} className="p-3 glass rounded-xl hover:bg-white/10 transition-colors" aria-label="Next">
              <ChevronRight size={24} />
            </button>
          </div>
          <div className="flex bg-white/5 rounded-2xl p-1">
            {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all capitalize ${
                  viewMode === mode ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleToggleRecording}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all shadow-lg ${
              isRecording
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
            }`}
          >
            {isRecording ? <Square size={24} className="animate-pulse" /> : <Mic size={24} />}
            {isRecording ? 'Stop Recording' : 'Voice Add'}
          </button>
          <button
            onClick={handleConnectGoogle}
            disabled={isSyncing}
            className={`bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-2xl flex items-center gap-3 font-bold transition-all ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Processing…' : 'Sync Google'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl flex items-center gap-3 font-bold transition-all transform active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <Plus size={24} />
            Add Event
          </button>
        </div>
      </div>

      {viewMode === 'month' && (
        <MonthGrid
          currentDate={currentDate}
          events={events}
          memberById={memberById}
          onPickDate={(d) => {
            setCurrentDate(d);
            setViewMode('day');
          }}
        />
      )}

      {viewMode === 'week' && (
        <WeekGrid
          weekStart={weekStart}
          events={events}
          memberById={memberById}
          onPickDate={(d) => {
            setCurrentDate(d);
            setViewMode('day');
          }}
        />
      )}

      {viewMode === 'day' && (
        <DayList currentDate={currentDate} events={events} memberById={memberById} />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-8 w-full max-w-lg border border-white/20 shadow-2xl">
            <h3 className="text-2xl font-bold mb-6">New Family Event</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Event Name</label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-white/10 rounded-2xl p-4 outline-none border border-white/10 focus:border-blue-500 transition-colors"
                  placeholder="e.g., Dentist Appointment"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Date</label>
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-white/10 rounded-2xl p-4 outline-none border border-white/10 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">For</label>
                <select
                  value={draft.assigned_to_member_id ?? ''}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, assigned_to_member_id: e.target.value || null }))
                  }
                  className="w-full bg-neutral-900 rounded-2xl p-4 outline-none border border-white/10 text-gray-300 focus:border-blue-500"
                >
                  <option value="">Whole family</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Category</label>
                <div className="grid grid-cols-3 gap-3">
                  {EVENT_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setDraft((prev) => ({ ...prev, category: cat }))}
                      className={`p-3 rounded-2xl border transition-all capitalize ${
                        draft.category === cat
                          ? `${CATEGORY_COLORS[cat]} border-white text-white`
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 py-4 rounded-2xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEvent}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold shadow-lg shadow-blue-600/20"
                >
                  Save Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type Member = ReturnType<typeof useMembersStore.getState>['items'][number];
type CalendarEvent = ReturnType<typeof useEventsStore.getState>['items'][number];

const EventChip: React.FC<{ event: CalendarEvent; member?: Member; size?: 'sm' | 'md' }> = ({
  event,
  member,
  size = 'sm',
}) => {
  const color = member?.avatar_color ?? CATEGORY_COLORS[event.category] ?? 'bg-blue-500';
  const sizing = size === 'sm' ? 'text-[10px] px-2 py-1' : 'text-sm px-3 py-2';
  return (
    <div className={`${color} ${sizing} rounded-md font-bold truncate flex items-center gap-1.5`}>
      {member && (
        <span className="inline-flex items-center justify-center shrink-0 w-4 h-4 rounded-full bg-white/30 text-[9px] font-bold">
          {member.name[0]}
        </span>
      )}
      <span className="truncate">{event.title}</span>
    </div>
  );
};

const MonthGrid: React.FC<{
  currentDate: Date;
  events: CalendarEvent[];
  memberById: Map<string, Member>;
  onPickDate: (d: Date) => void;
}> = ({ currentDate, events, memberById, onPickDate }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = todayLocalDate();

  return (
    <div className="flex-1 grid grid-cols-7 gap-px bg-white/10 rounded-3xl overflow-hidden border border-white/10">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
        <div key={day} className="bg-white/5 p-4 text-center font-bold text-gray-400 text-xs uppercase tracking-widest">
          {day}
        </div>
      ))}
      {Array.from({ length: firstDay }).map((_, i) => (
        <div key={`empty-${i}`} className="bg-white/5 min-h-[120px]"></div>
      ))}
      {Array.from({ length: daysInMonth }).map((_, i) => {
        const day = i + 1;
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);
        const dayEvents = events.filter((e) => e.date === dateStr);
        const isToday = dateStr === today;

        return (
          <button
            key={day}
            onClick={() => onPickDate(date)}
            className="bg-white/5 min-h-[120px] p-2 hover:bg-white/10 transition-colors group text-left"
          >
            <span
              className={`text-sm font-semibold ml-2 mt-2 inline-flex items-center justify-center w-7 h-7 rounded-full ${
                isToday ? 'bg-blue-600 text-white' : 'opacity-60 group-hover:opacity-100'
              }`}
            >
              {day}
            </span>
            <div className="mt-2 space-y-1">
              {dayEvents.map((event) => (
                <EventChip
                  key={event.id}
                  event={event}
                  member={event.assigned_to_member_id ? memberById.get(event.assigned_to_member_id) : undefined}
                />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
};

const WeekGrid: React.FC<{
  weekStart: Date;
  events: CalendarEvent[];
  memberById: Map<string, Member>;
  onPickDate: (d: Date) => void;
}> = ({ weekStart, events, memberById, onPickDate }) => {
  const today = todayLocalDate();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex-1 grid grid-cols-7 gap-px bg-white/10 rounded-3xl overflow-hidden border border-white/10">
      {days.map((d) => {
        const dateStr = formatDate(d);
        const isToday = dateStr === today;
        return (
          <div key={`h-${dateStr}`} className="bg-white/5 p-4 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{format(d, 'EEE')}</p>
            <p
              className={`text-2xl font-bold mt-1 inline-flex items-center justify-center w-10 h-10 rounded-full ${
                isToday ? 'bg-blue-600 text-white' : 'text-white'
              }`}
            >
              {format(d, 'd')}
            </p>
          </div>
        );
      })}
      {days.map((d) => {
        const dateStr = formatDate(d);
        const dayEvents = events.filter((e) => e.date === dateStr);
        return (
          <button
            key={`b-${dateStr}`}
            onClick={() => onPickDate(d)}
            className="bg-white/5 hover:bg-white/10 transition-colors p-3 space-y-2 text-left min-h-[400px]"
          >
            {dayEvents.length === 0 ? (
              <p className="text-gray-700 text-xs italic">No events</p>
            ) : (
              dayEvents.map((event) => (
                <EventChip
                  key={event.id}
                  event={event}
                  member={event.assigned_to_member_id ? memberById.get(event.assigned_to_member_id) : undefined}
                  size="md"
                />
              ))
            )}
          </button>
        );
      })}
    </div>
  );
};

const DayList: React.FC<{
  currentDate: Date;
  events: CalendarEvent[];
  memberById: Map<string, Member>;
}> = ({ currentDate, events, memberById }) => {
  const dateStr = formatDate(currentDate);
  const dayEvents = events.filter((e) => e.date === dateStr);
  const isToday = isSameDay(currentDate, new Date());

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="glass rounded-3xl p-8 max-w-2xl mx-auto">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
              {isToday ? 'Today' : format(currentDate, 'EEEE')}
            </p>
            <h3 className="text-3xl font-bold mt-1">{format(currentDate, 'MMMM d')}</h3>
          </div>
          <p className="text-gray-500 font-bold">
            {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
          </p>
        </div>

        {dayEvents.length === 0 ? (
          <p className="text-gray-500 italic text-center py-12">Nothing on the calendar.</p>
        ) : (
          <div className="space-y-3">
            {dayEvents.map((event) => {
              const member = event.assigned_to_member_id ? memberById.get(event.assigned_to_member_id) : undefined;
              const color = member?.avatar_color ?? CATEGORY_COLORS[event.category] ?? 'bg-blue-500';
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/5"
                >
                  <div className={`w-2 h-12 rounded-full ${color}`}></div>
                  <div className="flex-1">
                    <p className="text-xl font-bold leading-tight">{event.title}</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                      {member ? `For ${member.name}` : `Category: ${event.category}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
