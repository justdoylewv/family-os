import { useCallback, useRef, useState } from 'react';

// Minimal typing for the Web Speech API (Safari/Chrome expose it as webkitSpeechRecognition).
interface Recognition {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Tap to talk. `onPartial` streams the words as they're heard; `onDone` gets the final text.
 * When the browser has no speech recognition (or the mic is blocked), `onUnavailable`
 * runs so the caller can fall back to the keyboard's dictation button.
 */
export function useDictation(opts: { onPartial: (t: string) => void; onDone: (t: string) => void; onUnavailable: (reason: string) => void }) {
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const toggle = useCallback(() => {
    if (rec.current) {
      rec.current.stop();
      return;
    }
    const Ctor = getCtor();
    if (!Ctor) {
      optsRef.current.onUnavailable('unsupported');
      return;
    }
    let heard = '';
    let failed = false;
    const r = new Ctor();
    r.lang = navigator.language || 'en-US';
    r.interimResults = true;
    r.onresult = (e) => {
      heard = Array.from(e.results).map((x) => x[0].transcript).join(' ');
      optsRef.current.onPartial(heard);
    };
    r.onerror = (e) => {
      failed = true;
      optsRef.current.onUnavailable(e.error);
    };
    r.onend = () => {
      rec.current = null;
      setListening(false);
      if (!failed && heard.trim()) optsRef.current.onDone(heard);
    };
    try {
      r.start();
      rec.current = r;
      setListening(true);
    } catch {
      optsRef.current.onUnavailable('start-failed');
    }
  }, []);

  return { listening, toggle };
}
