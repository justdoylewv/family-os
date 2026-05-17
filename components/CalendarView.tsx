
import React, { useState, useEffect } from 'react';
import { CalendarEvent, Category } from '../types';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Mic, Square } from 'lucide-react';
import { CATEGORY_COLORS } from '../constants';

interface Props {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
}

const CalendarView: React.FC<Props> = ({ events, setEvents }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', category: Category.FAMILY, date: '' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsSyncing(true);
        const tokens = event.data.tokens;
        try {
          const res = await fetch('/api/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokens })
          });
          const data = await res.json();
          if (data.events) {
            const newEvents: CalendarEvent[] = data.events.map((ge: any) => ({
              id: ge.id,
              title: ge.summary || 'Busy',
              date: (ge.start?.date || ge.start?.dateTime)?.split('T')[0] || '',
              category: Category.FAMILY,
            })).filter((e: CalendarEvent) => e.date);
            
            setEvents(prev => {
              const prevIds = new Set(prev.map(p => p.id));
              const merged = [...prev];
              for (const ne of newEvents) {
                if (!prevIds.has(ne.id)) {
                  merged.push(ne);
                }
              }
              return merged;
            });
            alert('Calendar synced successfully!');
          } else if (data.error) {
             alert('Error syncing calendar: ' + data.error);
          }
        } catch (error) {
          console.error("Failed to fetch calendar", error);
          alert('Failed to sync calendar data.');
        } finally {
          setIsSyncing(false);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setEvents]);

  const handleConnectGmail = async () => {
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const response = await fetch(`/api/auth/url?redirectUri=${encodeURIComponent(redirectUri)}`);
      if (!response.ok) {
        throw new Error('Failed to get auth URL. Check API setup.');
      }
      const { url } = await response.json();
      
      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );
      if (!authWindow) {
        alert('Please allow popups for this site to connect your account.');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      alert('Failed to initiate login. Did you configure OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET?');
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
      // Use webm or mp4 depending on browser support, but webm is standard in Chrome
      const recorder = new MediaRecorder(stream);
      
      const audioChunks: BlobPart[] = [];
      recorder.ondataavailable = e => {
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
            const res = await fetch('/api/parse-events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioData: base64data, mimeType: audioBlob.type })
            });
            const data = await res.json();
            if (data.events) {
              setEvents(prev => [...prev, ...data.events.map((e: any) => ({ ...e, id: Date.now().toString() + Math.random().toString() }))]);
              alert(`Added ${data.events.length} events from voice!`);
            }
          } catch (error) {
             console.error(error);
             alert('Failed to parse voice audio.');
          } finally {
             setIsSyncing(false);
             stream.getTracks().forEach(track => track.stop());
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

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date) return;
    setEvents(prev => [...prev, { ...newEvent, id: Date.now().toString() }]);
    setNewEvent({ title: '', category: Category.FAMILY, date: '' });
    setShowModal(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <h2 className="text-3xl font-bold">{monthName} <span className="text-gray-500">{year}</span></h2>
          <div className="flex gap-2">
            <button onClick={handlePrevMonth} className="p-3 glass rounded-xl hover:bg-white/10 transition-colors">
              <ChevronLeft size={24} />
            </button>
            <button onClick={handleNextMonth} className="p-3 glass rounded-xl hover:bg-white/10 transition-colors">
              <ChevronRight size={24} />
            </button>
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
            onClick={handleConnectGmail}
            disabled={isSyncing}
            className={`bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-2xl flex items-center gap-3 font-bold transition-all ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Processing...' : 'Sync Gmail'}
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

      <div className="flex-1 grid grid-cols-7 gap-px bg-white/10 rounded-3xl overflow-hidden border border-white/10">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-white/5 p-4 text-center font-bold text-gray-400 text-xs uppercase tracking-widest">{day}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-white/5 min-h-[120px]"></div>
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEvents = events.filter(e => e.date === dateStr);

          return (
            <div key={day} className="bg-white/5 min-h-[120px] p-2 hover:bg-white/10 transition-colors group">
              <span className="text-sm font-semibold ml-2 mt-2 inline-block opacity-60 group-hover:opacity-100">{day}</span>
              <div className="mt-2 space-y-1">
                {dayEvents.map(event => (
                  <div key={event.id} className={`${CATEGORY_COLORS[event.category]} text-[10px] px-2 py-1 rounded-md font-bold truncate`}>
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-8 w-full max-w-lg border border-white/20 shadow-2xl">
            <h3 className="text-2xl font-bold mb-6">New Family Event</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Event Name</label>
                <input 
                  type="text" 
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-white/10 rounded-2xl p-4 outline-none border border-white/10 focus:border-blue-500 transition-colors"
                  placeholder="e.g., Dentist Appointment"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Date</label>
                <input 
                  type="date" 
                  value={newEvent.date}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-white/10 rounded-2xl p-4 outline-none border border-white/10 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Category</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(Category).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setNewEvent(prev => ({ ...prev, category: cat }))}
                      className={`p-4 rounded-2xl border transition-all ${
                        newEvent.category === cat 
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

export default CalendarView;
