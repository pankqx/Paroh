import { app } from 'electron';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { atomicWrite } from './vault/atomicWrite';

/** App-level settings, kept in Electron's userData folder, not in the vault. */
interface AppSettings {
  vaultPath?: string;
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

/** PAROH_VAULT overrides everything (dev and tests); otherwise ~/Paroh until the user picks a folder. */
export async function resolveVaultPath(): Promise<string> {
  if (process.env.PAROH_VAULT) return process.env.PAROH_VAULT;
  return (await readSettings()).vaultPath ?? join(app.getPath('home'), 'Paroh');
}
