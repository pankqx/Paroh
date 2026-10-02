import { BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron';
import { IPC, type VaultInfo } from '../../shared/ipc-contract';
import { readSettings, writeSettings } from '../settings';

export function registerVaultIpc(getPath: () => string, setPath: (path: string) => Promise<void>): void {
  ipcMain.handle(IPC.vaultInfo, (): VaultInfo => ({ path: getPath() }));
  ipcMain.handle(IPC.vaultChoose, async (event): Promise<VaultInfo | null> => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const options: OpenDialogOptions = { title: 'Choose your Paroh vault folder', defaultPath: getPath(), properties: ['openDirectory', 'createDirectory'] };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) return null;
    const path = result.filePaths[0];
    await writeSettings({ ...(await readSettings()), vaultPath: path });
    await setPath(path);
    return { path };
  });
}
