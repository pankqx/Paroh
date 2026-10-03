import { app, BrowserWindow, net, protocol, safeStorage, session, shell } from 'electron';
import { pathToFileURL } from 'node:url';
import { mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { IPC, type VaultChange } from '../shared/ipc-contract';
import { MODEL_SCHEME } from '../shared/speechModel';
import { aiFeatureEnabled } from './ai/aiFeatureEnabled';
import { ApiKeyStore } from './ai/apiKeyStore';
import { CloudAIProvider } from './ai/CloudAIProvider';
import { EditorsNoteService } from './ai/EditorsNoteService';
import { SpeechModelStore } from './ai/SpeechModelStore';
import { registerAiIpc } from './ipc/ai.ipc';
import { EntryService } from './EntryService';
import { registerDailyIpc, type DailyStores } from './ipc/daily.ipc';
import { registerEntriesIpc } from './ipc/entries.ipc';
import { registerVaultIpc } from './ipc/vault.ipc';
import { ReminderScheduler } from './reminders';
import { readSettings, resolveVaultPath } from './settings';
import { AudioStore } from './stores/AudioStore';
import { HabitStore } from './stores/HabitStore';
import { HorizonStore } from './stores/HorizonStore';
import { TaskStore } from './stores/TaskStore';

let service: EntryService;
let stores: DailyStores;
let notes: EditorsNoteService;

// Model files reach the renderer through this read-only scheme; it must be registered before the app is ready.
protocol.registerSchemesAsPrivileged([{ scheme: MODEL_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

function broadcast(change: VaultChange): void {
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send(IPC.vaultChanged, change);
}

async function openVault(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
  const next = await EntryService.open(path);
  next.watch((dates) => broadcast({ dates }));
  const previous = service;
  service = next;
  stores = { habits: new HabitStore(next), tasks: new TaskStore(next.fs), audio: new AudioStore(next), horizons: new HorizonStore(next.fs) };
  await stores.audio.syncTranscriptIndex();
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
    // Hides the default File/Edit/View bar on Windows and Linux; Alt still reveals it.
    autoHideMenuBar: true,
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

// One Paroh at a time: a second launch focuses the open window instead of opening the vault twice.
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});
// Windows only shows notifications (the daily reminder) for apps with an AppUserModelID matching the installer's.
if (process.platform === 'win32') app.setAppUserModelId('org.paroh.app');

app.whenReady().then(async () => {
  // The microphone (for Audio Logs) is the only permission the app ever grants, and only to its own page.
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    const own = wc.getURL().startsWith('file://') || (process.env.ELECTRON_RENDERER_URL && wc.getURL().startsWith(process.env.ELECTRON_RENDERER_URL));
    callback(Boolean(own) && permission === 'media' && (details as { mediaTypes?: string[] }).mediaTypes?.every((t) => t === 'audio') !== false);
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media');

  const keys = new ApiKeyStore(join(app.getPath('userData'), 'secrets.json'), {
    available: () => safeStorage.isEncryptionAvailable(),
    encrypt: (text) => safeStorage.encryptString(text),
    decrypt: (data) => safeStorage.decryptString(data),
    strong: () => process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text',
  });
  const speechModel = new SpeechModelStore({
    root: join(app.getPath('userData'), 'models'),
    fetch: (input, init) => net.fetch(input instanceof Request ? input : String(input), init),
    onChange: (status) => {
      for (const win of BrowserWindow.getAllWindows()) win.webContents.send(IPC.aiModelChanged, status);
    },
  });
  protocol.handle(MODEL_SCHEME, async (request) => {
    const url = new URL(request.url);
    const file = url.host === 'models' && request.method === 'GET' ? speechModel.resolveFile(url.pathname.slice(1)) : null;
    const res = file ? await net.fetch(pathToFileURL(file).toString()).catch(() => null) : null;
    // The speech worker runs on the app's own origin, so model files need a CORS header to be readable.
    const headers = { 'Access-Control-Allow-Origin': '*' };
    if (!res?.ok) return new Response('Not found', { status: 404, headers });
    const size = file ? (await stat(file)).size : 0;
    return new Response(res.body, { status: 200, headers: { ...headers, 'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream', 'Content-Length': String(size) } });
  });

  await openVault(await resolveVaultPath());
  notes = new EditorsNoteService({
    vaultRoot: () => service.root,
    loadMonth: (month) => service.monthEntries(month),
    enabled: () => aiFeatureEnabled('editors-note'),
    provider: async () => {
      const apiKey = await keys.get();
      // A local stand-in for Anthropic's API, honoured only in development builds (used by the end-to-end checks).
      const baseURL = !app.isPackaged ? process.env.PAROH_ANTHROPIC_BASE_URL : undefined;
      return apiKey ? new CloudAIProvider({ apiKey, baseURL }) : null;
    },
  });
  registerAiIpc(keys, () => notes, speechModel);

  registerEntriesIpc(() => service);
  registerDailyIpc(() => stores);
  const reminders = new ReminderScheduler();
  reminders.set((await readSettings()).reminderTime);
  registerVaultIpc(
    () => service.root,
    async (path) => {
      await openVault(path);
      broadcast({ dates: [], reset: true });
    },
    reminders,
    keys,
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
