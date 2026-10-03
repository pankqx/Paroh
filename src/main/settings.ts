import { app } from 'electron';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { atomicWrite } from './vault/atomicWrite';

/** App-level settings, kept in Electron's userData folder and never in the vault (feature-specifications.md §12). */
export interface AppSettings {
  vaultPath?: string;
  onboarded?: boolean;
  /** Keyed per feature, never one global AI flag; a missing key means off. */
  aiFeatures?: Record<string, boolean>;
  /** Daily reminder, local time `HH:MM`; absent means no reminder. */
  reminderTime?: string;
}

const settingsPath = () => join(app.getPath('userData'), 'settings.json');

export async function readSettings(): Promise<AppSettings> {
  try {
    return JSON.parse(await readFile(settingsPath(), 'utf8')) as AppSettings;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') console.error('settings.json unreadable, using defaults:', (e as Error).message);
    return {};
  }
}

export async function writeSettings(settings: AppSettings): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true });
  await atomicWrite(settingsPath(), JSON.stringify(settings, null, 2));
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const next = { ...(await readSettings()), ...patch };
  await writeSettings(next);
  return next;
}

/** PAROH_VAULT overrides everything (dev and tests); otherwise ~/Paroh until the user picks a folder. */
export async function resolveVaultPath(): Promise<string> {
  if (process.env.PAROH_VAULT) return process.env.PAROH_VAULT;
  return (await readSettings()).vaultPath ?? join(app.getPath('home'), 'Paroh');
}

/** Someone who already picked a folder, or a dev/test run with PAROH_VAULT, skips onboarding. */
export function isOnboarded(settings: AppSettings): boolean {
  return Boolean(process.env.PAROH_VAULT || settings.onboarded || settings.vaultPath);
}
