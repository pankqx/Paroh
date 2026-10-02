import { app, BrowserWindow, session, shell } from 'electron';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { IPC, type VaultChange } from '../shared/ipc-contract';
import { EntryService } from './EntryService';
import { registerDailyIpc, type DailyStores } from './ipc/daily.ipc';
import { registerEntriesIpc } from './ipc/entries.ipc';
import { registerVaultIpc } from './ipc/vault.ipc';
import { resolveVaultPath } from './settings';
import { AudioStore } from './stores/AudioStore';
import { HabitStore } from './stores/HabitStore';
import { TaskStore } from './stores/TaskStore';

let service: EntryService;
let stores: DailyStores;

function broadcast(change: VaultChange): void {
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send(IPC.vaultChanged, change);
}

async function openVault(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
  const next = await EntryService.open(path);
  next.watch((dates) => broadcast({ dates }));
  const previous = service;
  service = next;
  stores = { habits: new HabitStore(next), tasks: new TaskStore(path), audio: new AudioStore(next) };
  previous?.close();
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    title: 'Paroh',
    backgroundColor: '#F3F1EA',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Renderer isolation (architecture.md §IPC & Process Boundary): no Node in the page, ever.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());
  // External links open in the system browser; the app window never navigates away.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());

  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void win.loadFile(join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(async () => {
  // The microphone (for Audio Logs) is the only permission the app ever grants, and only to its own page.
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    const own = wc.getURL().startsWith('file://') || (process.env.ELECTRON_RENDERER_URL && wc.getURL().startsWith(process.env.ELECTRON_RENDERER_URL));
    callback(Boolean(own) && permission === 'media' && (details as { mediaTypes?: string[] }).mediaTypes?.every((t) => t === 'audio') !== false);
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media');

  await openVault(await resolveVaultPath());

  registerEntriesIpc(() => service);
  registerDailyIpc(() => stores);
  registerVaultIpc(
    () => service.root,
    async (path) => {
      await openVault(path);
      broadcast({ dates: [], reset: true });
    },
  );

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => service?.close());
