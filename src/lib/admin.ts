import { useState } from 'react';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? '';

export function useAdminGate() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const requestToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
    } else {
      setShowPrompt(true);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ADMIN_PASSWORD) {
      alert('Admin password not configured. Set VITE_ADMIN_PASSWORD in your env.');
      return;
    }
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowPrompt(false);
      setPasswordInput('');
    } else {
      alert('Incorrect password');
      setPasswordInput('');
    }
  };

  const cancel = () => {
    setShowPrompt(false);
    setPasswordInput('');
  };

  return {
    isAdmin,
    showPrompt,
    passwordInput,
    setPasswordInput,
    requestToggle,
    submit,
    cancel,
  };
}
