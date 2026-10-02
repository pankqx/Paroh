import { app, BrowserWindow, shell } from 'electron';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { registerEntriesIpc } from './ipc/entries.ipc';
import { registerVaultIpc } from './ipc/vault.ipc';
import { resolveVaultPath } from './settings';
import { VaultAdapter } from './vault/VaultAdapter';

let vault: VaultAdapter;

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
  const path = await resolveVaultPath();
  await mkdir(path, { recursive: true });
  vault = new VaultAdapter(path);

  registerEntriesIpc(() => vault);
  registerVaultIpc(
    () => vault.root,
    (p) => (vault = new VaultAdapter(p)),
  );

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
