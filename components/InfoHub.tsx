
import React, { useState, useEffect } from 'react';
import { Wifi, PhoneCall, ClipboardList, Zap, ShieldAlert, Lock, Unlock, Plus, Trash2, Edit2, Check } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  phone: string;
}

interface ChoreMapping {
  id: string;
  chore: string;
  who: string;
  status: string;
  reward: string;
}

interface InfoHubData {
  wifiName: string;
  wifiPass: string;
  contacts: Contact[];
  chores: ChoreMapping[];
}

const defaultData: InfoHubData = {
  wifiName: 'The_Smith_House_5G',
  wifiPass: 'apples-and-bananas-2024',
  contacts: [
    { id: '1', name: 'Dr. Sarah (Pediatrician)', phone: '(555) 012-3456' },
    { id: '2', name: 'Village Vet Hospital', phone: '(555) 987-6543' },
    { id: '3', name: 'Poison Control', phone: '1-800-222-1222' },
    { id: '4', name: 'Property Management', phone: '(555) 111-2222' }
  ],
  chores: [
    { id: '1', chore: 'Dishwasher Loading', who: 'Leo', status: 'Pending', reward: '15m Screen Time' },
    { id: '2', chore: 'Trash & Recycling', who: 'Dad', status: 'Done', reward: 'High Five' },
    { id: '3', chore: 'Dog Walking (PM)', who: 'Maya', status: 'In Progress', reward: 'Choice of Movie' },
    { id: '4', chore: 'Fold Laundry', who: 'Mom', status: 'Pending', reward: 'Peace & Quiet' }
  ]
};

const InfoHub: React.FC = () => {
  const [data, setData] = useState<InfoHubData>(() => {
    const saved = localStorage.getItem('family_info_hub');
    return saved ? JSON.parse(saved) : defaultData;
  });

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  useEffect(() => {
    localStorage.setItem('family_info_hub', JSON.stringify(data));
  }, [data]);

  const toggleAdminMode = () => {
    if (isAdminMode) {
      setIsAdminMode(false);
    } else {
      setShowPasswordPrompt(true);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'Bigred257!') {
      setIsAdminMode(true);
      setShowPasswordPrompt(false);
      setPasswordInput('');
    } else {
      alert('Incorrect password');
      setPasswordInput('');
    }
  };

  const updateWifi = (key: 'wifiName' | 'wifiPass', val: string) => {
    setData(prev => ({ ...prev, [key]: val }));
  };

  const updateContact = (id: string, key: keyof Contact, val: string) => {
    setData(prev => ({
      ...prev,
      contacts: prev.contacts.map(c => c.id === id ? { ...c, [key]: val } : c)
    }));
  };

  const addContact = () => {
    setData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { id: Date.now().toString(), name: 'New Contact', phone: '' }]
    }));
  };

  const removeContact = (id: string) => {
    setData(prev => ({
      ...prev,
      contacts: prev.contacts.filter(c => c.id !== id)
    }));
  };

  const updateChore = (id: string, key: keyof ChoreMapping, val: string) => {
    setData(prev => ({
      ...prev,
      chores: prev.chores.map(c => c.id === id ? { ...c, [key]: val } : c)
    }));
  };

  const addChore = () => {
    setData(prev => ({
      ...prev,
      chores: [...prev.chores, { id: Date.now().toString(), chore: 'New Chore', who: '', status: 'Pending', reward: '' }]
    }));
  };

  const removeChore = (id: string) => {
    setData(prev => ({
      ...prev,
      chores: prev.chores.filter(c => c.id !== id)
    }));
  };

  return (
    <div className="space-y-10 relative">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Information Hub</h2>
        <button 
          onClick={toggleAdminMode}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${isAdminMode ? 'bg-red-500/20 text-red-400' : 'bg-white/10 hover:bg-white/20'}`}
        >
          {isAdminMode ? <Unlock size={18} /> : <Lock size={18} />}
          {isAdminMode ? 'Admin Mode (Active)' : 'Enter Admin Mode'}
        </button>
      </div>

      {showPasswordPrompt && (
        <div className="absolute top-16 right-0 z-10 glass p-4 rounded-2xl shadow-2xl border border-white/20 w-72">
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-300">Enter Admin Password:</p>
            <input 
              type="password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 text-sm mt-1">
              <button type="button" onClick={() => setShowPasswordPrompt(false)} className="px-3 py-1.5 hover:bg-white/10 rounded-md">Cancel</button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-md text-white font-medium">Unlock</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* WiFi Card */}
        <div className="glass rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-center shadow-xl border-t border-white/10">
          <div className="flex-1 space-y-4 w-full">
            <div className="flex items-center gap-4 text-blue-400">
              <Wifi size={32} />
              <h3 className="text-2xl font-bold">Guest WiFi</h3>
            </div>
            <div className="space-y-1">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Network Name</p>
              {isAdminMode ? (
                <input 
                  type="text" 
                  value={data.wifiName}
                  onChange={(e) => updateWifi('wifiName', e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xl font-mono text-white w-full max-w-sm outline-none focus:border-blue-500"
                />
              ) : (
                <p className="text-2xl font-mono text-white">{data.wifiName}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Password</p>
              {isAdminMode ? (
                <input 
                  type="text" 
                  value={data.wifiPass}
                  onChange={(e) => updateWifi('wifiPass', e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xl font-mono text-white w-full max-w-sm outline-none focus:border-blue-500"
                />
              ) : (
                <p className="text-2xl font-mono text-white">{data.wifiPass}</p>
              )}
            </div>
          </div>
          <div className="w-48 h-48 bg-white p-4 rounded-2xl shadow-inner flex items-center justify-center shrink-0">
             <div className={`w-full h-full bg-center bg-no-repeat bg-contain`} style={{backgroundImage: `url('https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=WIFI:S:${encodeURIComponent(data.wifiName)};T:WPA;P:${encodeURIComponent(data.wifiPass)};;')`}}></div>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="glass rounded-3xl p-8 shadow-xl">
           <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-4 text-red-500">
                <ShieldAlert size={32} />
                <h3 className="text-2xl font-bold">Emergency Contacts</h3>
              </div>
              {isAdminMode && (
                <button onClick={addContact} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white">
                  <Plus size={18} />
                </button>
              )}
            </div>
            <div className="space-y-4">
              {data.contacts.map((contact, i) => {
                const colors = ['bg-blue-500/10 text-blue-400', 'bg-green-500/10 text-green-400', 'bg-red-500/10 text-red-400 font-bold', 'bg-orange-500/10 text-orange-400'];
                const color = colors[i % colors.length];
                
                if (isAdminMode) {
                  return (
                    <div key={contact.id} className="flex gap-2 items-center p-3 bg-white/5 rounded-2xl border border-white/10">
                      <div className="flex-1 space-y-2">
                        <input 
                          type="text" 
                          value={contact.name}
                          onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                          className="bg-black/50 border border-white/10 rounded-md px-3 py-1.5 w-full outline-none focus:border-blue-500 text-sm"
                          placeholder="Name..."
                        />
                        <input 
                          type="text" 
                          value={contact.phone}
                          onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                          className="bg-black/50 border border-white/10 rounded-md px-3 py-1.5 w-full outline-none focus:border-blue-500 text-sm"
                          placeholder="Phone..."
                        />
                      </div>
                      <button onClick={() => removeContact(contact.id)} className="p-3 text-red-400 hover:bg-red-500/20 rounded-xl">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={contact.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                    <span className="font-semibold text-lg">{contact.name}</span>
                    <a href={`tel:${contact.phone}`} className={`${color} px-4 py-2 rounded-xl flex items-center gap-2 text-sm`}>
                      <PhoneCall size={14} />
                      {contact.phone}
                    </a>
                  </div>
                );
              })}
            </div>
        </div>

        {/* Chore Chart */}
        <div className="glass rounded-3xl p-8 shadow-xl lg:col-span-2">
           <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-4 text-purple-400">
                <ClipboardList size={32} />
                <h3 className="text-2xl font-bold">Daily Chore Assignments</h3>
              </div>
              {isAdminMode && (
                <button onClick={addChore} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white">
                  <Plus size={18} />
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left border-b border-white/10">
                    <th className="pb-4 font-bold text-gray-500 uppercase text-xs tracking-[0.2em]">Assignment</th>
                    <th className="pb-4 font-bold text-gray-500 uppercase text-xs tracking-[0.2em]">Assigned To</th>
                    <th className="pb-4 font-bold text-gray-500 uppercase text-xs tracking-[0.2em]">Status</th>
                    <th className="pb-4 font-bold text-gray-500 uppercase text-xs tracking-[0.2em]">Reward</th>
                    {isAdminMode && <th className="pb-4 font-bold text-gray-500 uppercase text-xs tracking-[0.2em]">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.chores.map((row) => (
                    <tr key={row.id} className="group">
                      <td className="py-4">
                        {isAdminMode ? (
                          <input type="text" value={row.chore} onChange={(e) => updateChore(row.id, 'chore', e.target.value)} className="bg-black/50 border border-white/10 rounded-md px-2 py-1 outline-none focus:border-blue-500 min-w-[150px]" />
                        ) : (
                          <span className="font-semibold text-xl">{row.chore}</span>
                        )}
                      </td>
                      <td className="py-4">
                        {isAdminMode ? (
                          <input type="text" value={row.who} onChange={(e) => updateChore(row.id, 'who', e.target.value)} className="bg-black/50 border border-white/10 rounded-md px-2 py-1 outline-none focus:border-blue-500 w-24" />
                        ) : (
                          <span className="bg-white/10 px-4 py-2 rounded-xl text-lg">{row.who}</span>
                        )}
                      </td>
                      <td className="py-4">
                        {isAdminMode ? (
                          <select value={row.status} onChange={(e) => updateChore(row.id, 'status', e.target.value)} className="bg-black/50 border border-white/10 rounded-md px-2 py-1.5 outline-none focus:border-blue-500 text-sm">
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                          </select>
                        ) : (
                          <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase ${
                            row.status === 'Done' ? 'bg-green-500/20 text-green-400' : 
                            row.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {row.status}
                          </span>
                        )}
                      </td>
                      <td className="py-4">
                         {isAdminMode ? (
                          <input type="text" value={row.reward} onChange={(e) => updateChore(row.id, 'reward', e.target.value)} className="bg-black/50 border border-white/10 rounded-md px-2 py-1 outline-none focus:border-blue-500 w-full min-w-[120px]" />
                        ) : (
                          <span className="italic text-gray-400">{row.reward}</span>
                        )}
                      </td>
                      {isAdminMode && (
                        <td className="py-4">
                          <button onClick={() => removeChore(row.id)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      </div>

      <div className="flex justify-center pt-8 text-gray-600 text-sm font-medium">
        <Zap size={16} className="inline mr-2" />
        Family OS v1.0.2 • Syncing with Cloud
      </div>
    </div>
  );
};

export default InfoHub;

