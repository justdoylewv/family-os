import React, { useState } from 'react';
import { Home, Loader2 } from 'lucide-react';
import { signInWithFamilyPassword } from '../lib/auth';

const LoginGate: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    setError(null);
    const result = await signInWithFamilyPassword(password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? 'Sign in failed');
      setPassword('');
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black text-white p-6">
      <form
        onSubmit={handleSubmit}
        className="glass rounded-3xl p-10 w-full max-w-md shadow-2xl border-white/10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
            <Home size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Family OS</h1>
          <p className="text-gray-500 text-sm mt-2">Enter the family password</p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="w-full bg-white/5 rounded-2xl p-5 outline-none border border-white/10 focus:border-blue-500 transition-all text-xl text-center tracking-widest"
          placeholder="••••••••"
        />

        {error && (
          <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !password}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:opacity-50 py-5 rounded-2xl font-bold text-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-3"
        >
          {submitting ? <Loader2 className="animate-spin" size={22} /> : null}
          {submitting ? 'Signing in…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
};

export default LoginGate;
