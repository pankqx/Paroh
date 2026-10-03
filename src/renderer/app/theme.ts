import { useEffect, useSyncExternalStore } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

const KEY = 'paroh.theme';
const listeners = new Set<() => void>();
const darkQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

/** A per-device choice (like a reading lamp), so it lives in localStorage rather than the vault. */
export function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    // Storage can be blocked (private window); following the system is the safe default.
    return 'system';
  }
}

export function resolveTheme(pref: ThemePreference): Theme {
  if (pref !== 'system') return pref;
  return darkQuery?.matches ? 'dark' : 'light';
}

/** Sets `data-theme` on <html>; called before the first render so there is never a flash of the wrong theme. */
export function applyTheme(pref: ThemePreference = readPreference()): void {
  document.documentElement.dataset.theme = resolveTheme(pref);
}

export function setPreference(pref: ThemePreference): void {
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // Not persisted, but the theme still changes for this session.
  }
  applyTheme(pref);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme(): { preference: ThemePreference; theme: Theme; setPreference: (p: ThemePreference) => void } {
  const preference = useSyncExternalStore(subscribe, readPreference);
  // Follow the OS live while the preference is "system".
  useEffect(() => {
    if (!darkQuery || preference !== 'system') return;
    const onChange = () => {
      applyTheme('system');
      listeners.forEach((l) => l());
    };
    darkQuery.addEventListener('change', onChange);
    return () => darkQuery.removeEventListener('change', onChange);
  }, [preference]);
  return { preference, theme: resolveTheme(preference), setPreference };
}
