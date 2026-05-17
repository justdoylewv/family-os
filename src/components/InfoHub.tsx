import React, { useEffect, useState } from 'react';
import { Wifi, PhoneCall, Zap, ShieldAlert, Lock, Unlock, Plus, Trash2 } from 'lucide-react';
import QRCode from 'qrcode';
import { useAdminGate } from '../lib/admin';
import { useContactsStore, useSettingsStore } from '../lib/db';

const WIFI_NAME_KEY = 'wifi_name';
const WIFI_PASS_KEY = 'wifi_pass';

const InfoHub: React.FC = () => {
  const contacts = useContactsStore((s) => s.items);
  const addContact = useContactsStore((s) => s.add);
  const updateContact = useContactsStore((s) => s.update);
  const removeContact = useContactsStore((s) => s.remove);

  const wifiName = useSettingsStore((s) => s.values[WIFI_NAME_KEY] ?? '');
  const wifiPass = useSettingsStore((s) => s.values[WIFI_PASS_KEY] ?? '');
  const setSetting = useSettingsStore((s) => s.set);

  const admin = useAdminGate();

  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!wifiName) {
      setQrDataUrl('');
      return;
    }
    let cancelled = false;
    const wifiString = `WIFI:S:${wifiName};T:WPA;P:${wifiPass};;`;
    QRCode.toDataURL(wifiString, { margin: 1, width: 180 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [wifiName, wifiPass]);

  return (
    <div className="space-y-10 relative">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Information Hub</h2>
        <button
          onClick={admin.requestToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${admin.isAdmin ? 'bg-red-500/20 text-red-400' : 'bg-white/10 hover:bg-white/20'}`}
        >
          {admin.isAdmin ? <Unlock size={18} /> : <Lock size={18} />}
          {admin.isAdmin ? 'Admin Mode (Active)' : 'Enter Admin Mode'}
        </button>
      </div>

      {admin.showPrompt && (
        <div className="absolute top-16 right-0 z-10 glass p-4 rounded-2xl shadow-2xl border border-white/20 w-72">
          <form onSubmit={admin.submit} className="flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-300">Enter Admin Password:</p>
            <input
              type="password"
              value={admin.passwordInput}
              onChange={(e) => admin.setPasswordInput(e.target.value)}
              className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 text-sm mt-1">
              <button type="button" onClick={admin.cancel} className="px-3 py-1.5 hover:bg-white/10 rounded-md">
                Cancel
              </button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-md text-white font-medium">
                Unlock
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-center shadow-xl border-t border-white/10">
          <div className="flex-1 space-y-4 w-full">
            <div className="flex items-center gap-4 text-blue-400">
              <Wifi size={32} />
              <h3 className="text-2xl font-bold">Guest WiFi</h3>
            </div>
            <div className="space-y-1">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Network Name</p>
              {admin.isAdmin ? (
                <input
                  type="text"
                  value={wifiName}
                  onChange={(e) => setSetting(WIFI_NAME_KEY, e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xl font-mono text-white w-full max-w-sm outline-none focus:border-blue-500"
                  placeholder="MyNetwork_5G"
                />
              ) : (
                <p className="text-2xl font-mono text-white">{wifiName || '—'}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Password</p>
              {admin.isAdmin ? (
                <input
                  type="text"
                  value={wifiPass}
                  onChange={(e) => setSetting(WIFI_PASS_KEY, e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xl font-mono text-white w-full max-w-sm outline-none focus:border-blue-500"
                  placeholder="••••••••"
                />
              ) : (
                <p className="text-2xl font-mono text-white">{wifiPass || '—'}</p>
              )}
            </div>
          </div>
          <div className="w-48 h-48 bg-white p-4 rounded-2xl shadow-inner flex items-center justify-center shrink-0">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="WiFi QR code" className="w-full h-full" />
            ) : (
              <p className="text-gray-500 text-xs text-center px-2">Set WiFi info to generate QR</p>
            )}
          </div>
        </div>

        <div className="glass rounded-3xl p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4 text-red-500">
              <ShieldAlert size={32} />
              <h3 className="text-2xl font-bold">Emergency Contacts</h3>
            </div>
            {admin.isAdmin && (
              <button
                onClick={() => addContact({ name: 'New Contact', phone: '' })}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
          <div className="space-y-4">
            {contacts.length === 0 && (
              <p className="text-gray-500 italic text-sm">No emergency contacts yet. Switch to Admin Mode to add some.</p>
            )}
            {contacts.map((contact, i) => {
              const colors = [
                'bg-blue-500/10 text-blue-400',
                'bg-green-500/10 text-green-400',
                'bg-red-500/10 text-red-400 font-bold',
                'bg-orange-500/10 text-orange-400',
              ];
              const color = colors[i % colors.length];

              if (admin.isAdmin) {
                return (
                  <div key={contact.id} className="flex gap-2 items-center p-3 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => updateContact(contact.id, { name: e.target.value })}
                        className="bg-black/50 border border-white/10 rounded-md px-3 py-1.5 w-full outline-none focus:border-blue-500 text-sm"
                        placeholder="Name…"
                      />
                      <input
                        type="text"
                        value={contact.phone}
                        onChange={(e) => updateContact(contact.id, { phone: e.target.value })}
                        className="bg-black/50 border border-white/10 rounded-md px-3 py-1.5 w-full outline-none focus:border-blue-500 text-sm"
                        placeholder="Phone…"
                      />
                    </div>
                    <button onClick={() => removeContact(contact.id)} className="p-3 text-red-400 hover:bg-red-500/20 rounded-xl">
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={contact.id}
                  className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors"
                >
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
      </div>

      <div className="flex justify-center pt-8 text-gray-600 text-sm font-medium">
        <Zap size={16} className="inline mr-2" />
        Family OS {__APP_VERSION__}
        {__APP_COMMIT__ && (
          <span className="ml-2 text-gray-700">• {__APP_COMMIT__.slice(0, 7)}</span>
        )}
      </div>
    </div>
  );
};

export default InfoHub;
