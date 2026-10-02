import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface RecorderState {
  recording: boolean;
  seconds: number;
  error: string | null;
  /** Bumps after every saved recording, so lists can refresh. */
  savedCount: number;
  toggle: () => void;
  dismissError: () => void;
}

const RecorderContext = createContext<RecorderState | null>(null);

const SOFT_LIMIT_SECONDS = 20 * 60;

/**
 * One recorder for the whole app, so recording keeps going while you move between pages and
 * Ctrl/Cmd+Shift+R works from anywhere (feature-specifications.md §8). Audio is streamed to disk
 * every second, so an interrupted recording is still saved up to that point.
 */
export function RecorderProvider({ children }: { children: ReactNode }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const session = useRef<{ recorder: MediaRecorder; stream: MediaStream; id: string; started: number; writes: Promise<unknown> } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const start = useCallback(async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const name = (e as DOMException).name;
      setError(
        name === 'NotAllowedError'
          ? 'Paroh is not allowed to use the microphone. Allow microphone access for Paroh in your system settings, then try again.'
          : name === 'NotFoundError'
            ? 'No microphone was found. Plug one in or check your sound settings, then try again.'
            : `The microphone could not be opened: ${(e as Error).message}`,
      );
      return;
    }
    const begun = await window.paroh.audio.begin();
    if (!begun.ok) {
      stream.getTracks().forEach((t) => t.stop());
      return setError(begun.error);
    }
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    const s = { recorder, stream, id: begun.value.id, started: Date.now(), writes: Promise.resolve() as Promise<unknown> };
    recorder.ondataavailable = (event) => {
      if (event.data.size === 0) return;
      // Chunks are written strictly in order.
      s.writes = s.writes.then(async () => {
        const r = await window.paroh.audio.append(s.id, new Uint8Array(await event.data.arrayBuffer()));
        if (!r.ok) setError(r.error);
      });
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const duration = (Date.now() - s.started) / 1000;
      void s.writes.then(async () => {
        const r = await window.paroh.audio.finish(s.id, duration);
        if (!r.ok) setError(r.error);
        setSavedCount((n) => n + 1);
      });
    };
    recorder.start(1000);
    session.current = s;
    setSeconds(0);
    setRecording(true);
    timer.current = setInterval(() => setSeconds(Math.floor((Date.now() - s.started) / 1000)), 500);
  }, []);

  const stop = useCallback(() => {
    clearInterval(timer.current);
    session.current?.recorder.stop();
    session.current = null;
    setRecording(false);
  }, []);

  const toggle = useCallback(() => {
    if (session.current) stop();
    else void start();
  }, [start, stop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  useEffect(() => () => clearInterval(timer.current), []);

  return (
    <RecorderContext.Provider value={{ recording, seconds, error, savedCount, toggle, dismissError: () => setError(null) }}>
      {children}
      {recording && (
        <div className="recording-bar" role="status">
          <span className="recording-dot" aria-hidden />
          Recording {formatDuration(seconds)}
          {seconds >= SOFT_LIMIT_SECONDS && <span className="muted"> · That’s a long one. Stop whenever it feels right.</span>}
          <button className="btn btn-accent" onClick={stop}>
            Stop
          </button>
        </div>
      )}
      {error && (
        <div className="recording-bar recording-error" role="alert">
          {error}
          <button className="btn" onClick={() => setError(null)}>
            OK
          </button>
        </div>
      )}
    </RecorderContext.Provider>
  );
}

export function useRecorder(): RecorderState {
  const ctx = useContext(RecorderContext);
  if (!ctx) throw new Error('useRecorder must be used inside RecorderProvider');
  return ctx;
}

export function formatDuration(total?: number): string {
  if (total === undefined) return '–:––';
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
