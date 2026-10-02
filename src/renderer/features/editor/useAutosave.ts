import { useCallback, useEffect, useRef, useState } from 'react';
import type { Entry } from '../../../shared/types/Entry';

export type SaveStatus = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; at: Date } | { kind: 'error'; message: string };

const DEBOUNCE_MS = 2000;

/**
 * Saves ~2s after the last change (feature-specifications.md §4), and immediately on flush().
 * Nothing is written until the user actually changes something, so opening a day never creates an empty file.
 */
export function useAutosave(onSaved: (entry: Entry) => void) {
  const latest = useRef<Entry | null>(null);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (!dirty.current || !latest.current) return true;
    dirty.current = false;
    setStatus({ kind: 'saving' });
    const result = await window.paroh.entries.save(latest.current);
    if (result.ok) {
      setStatus({ kind: 'saved', at: new Date() });
      onSaved(result.value);
      return true;
    }
    // Keep it dirty so the next change or Ctrl+S retries.
    dirty.current = true;
    setStatus({ kind: 'error', message: result.error });
    return false;
  }, [onSaved]);

  const change = useCallback(
    (entry: Entry) => {
      latest.current = entry;
      dirty.current = true;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
    },
    [flush],
  );

  // Leaving the editor (or closing the window) must not drop the last few seconds of typing.
  useEffect(() => {
    const beforeUnload = () => void flush();
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      void flush();
    };
  }, [flush]);

  const isDirty = useCallback(() => dirty.current, []);

  return { status, change, flush, isDirty };
}
