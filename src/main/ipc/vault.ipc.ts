import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent, type OpenDialogOptions } from 'electron';
import { readFile } from 'node:fs/promises';
import { isAiFeatureId } from '../../shared/aiFeatures';
import { IPC, type SettingsView, type VaultChoice, type VaultInfo } from '../../shared/ipc-contract';
import { isReminderTime } from '../../shared/reminder';
import { err, ok, type Result } from '../../shared/types/Result';
import type { ReminderScheduler } from '../reminders';
import { isOnboarded, readSettings, updateSettings } from '../settings';
import { classifyFolder, vaultFiles } from '../vault/vaultFolder';
import { extractZip, writeZip } from '../vault/zip';

const winOf = (e: IpcMainInvokeEvent) => BrowserWindow.fromWebContents(e.sender) ?? undefined;

function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export function registerVaultIpc(
  getPath: () => string,
  setPath: (path: string) => Promise<void>,
  reminders: ReminderScheduler,
  apiKey: { has(): Promise<boolean>; strong(): boolean },
): void {
  // A folder the user picked that holds unrelated files waits here until they confirm it; the renderer can never name a path itself.
  let pending: string | null = null;

  async function useFolder(path: string): Promise<VaultChoice> {
    await updateSettings({ vaultPath: path });
    await setPath(path);
    return { status: 'switched', path };
  }

  ipcMain.handle(IPC.vaultInfo, (): VaultInfo => ({ path: getPath() }));

  ipcMain.handle(IPC.vaultChoose, async (event): Promise<VaultChoice | null> => {
    const options: OpenDialogOptions = { title: 'Choose your Paroh vault folder', defaultPath: getPath(), properties: ['openDirectory', 'createDirectory'] };
    const win = winOf(event);
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) return null;
    const path = result.filePaths[0];
    const { kind, sample } = await classifyFolder(path);
    if (kind === 'other') {
      pending = path;
      return { status: 'needs-confirm', path, sample };
    }
    pending = null;
    return useFolder(path);
  });

  ipcMain.handle(IPC.vaultConfirmChoice, async (): Promise<VaultChoice | null> => {
    const path = pending;
    pending = null;
    return path ? useFolder(path) : null;
  });

  ipcMain.handle(IPC.vaultReveal, () => shell.openPath(getPath()));

  ipcMain.handle(IPC.vaultExport, async (event): Promise<Result<{ path: string; files: number; bytes: number } | null>> => {
    const win = winOf(event);
    const options = { title: 'Export your vault', defaultPath: `Paroh-export-${stamp()}.zip`, filters: [{ name: 'ZIP archive', extensions: ['zip'] }] };
    const choice = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options);
    if (choice.canceled || !choice.filePath) return ok(null);
    try {
      const files = await vaultFiles(getPath());
      const result = await writeZip(choice.filePath, files, (done, total) => event.sender.send(IPC.vaultExportProgress, { done, total }));
      return ok({ path: choice.filePath, ...result });
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      const why = code === 'ENOSPC' ? 'The disk is full.' : code === 'EACCES' || code === 'EPERM' ? 'Paroh is not allowed to write there.' : (e as Error).message;
      return err(`Export did not finish. ${why} Your vault itself is untouched.`);
    }
  });

  ipcMain.handle(IPC.vaultImport, async (event): Promise<Result<{ path: string; files: number } | null>> => {
    const win = winOf(event);
    const zipOpts: OpenDialogOptions = { title: 'Choose a Paroh export to import', filters: [{ name: 'ZIP archive', extensions: ['zip'] }], properties: ['openFile'] };
    const zip = win ? await dialog.showOpenDialog(win, zipOpts) : await dialog.showOpenDialog(zipOpts);
    if (zip.canceled || !zip.filePaths[0]) return ok(null);
    const dirOpts: OpenDialogOptions = { title: 'Choose an empty folder for the imported vault', properties: ['openDirectory', 'createDirectory'] };
    const dir = win ? await dialog.showOpenDialog(win, dirOpts) : await dialog.showOpenDialog(dirOpts);
    if (dir.canceled || !dir.filePaths[0]) return ok(null);
    const target = dir.filePaths[0];
    try {
      const { kind } = await classifyFolder(target);
      if (kind !== 'empty' && kind !== 'missing') return err('Pick an empty folder, so the import never mixes with other files.');
      const files = await extractZip(await readFile(zip.filePaths[0]), target);
      if ((await classifyFolder(target)).kind !== 'paroh') return err('That archive does not look like a Paroh vault. The files were extracted but your vault was not switched.');
      await useFolder(target);
      return ok({ path: target, files });
    } catch (e) {
      return err(`Import did not finish: ${(e as Error).message}`);
    }
  });

  ipcMain.handle(IPC.settingsGet, async (): Promise<SettingsView> => {
    const s = await readSettings();
    return {
      vaultPath: getPath(),
      onboarded: isOnboarded(s),
      aiFeatures: s.aiFeatures ?? {},
      reminderTime: s.reminderTime,
      version: app.getVersion(),
      hasApiKey: await apiKey.has(),
      apiKeyEncrypted: apiKey.strong(),
    };
  });

  ipcMain.handle(IPC.settingsSetAiFeature, async (_e, id: string, on: boolean): Promise<Result<void>> => {
    if (!isAiFeatureId(id)) return err('Unknown AI feature');
    const s = await readSettings();
    await updateSettings({ aiFeatures: { ...s.aiFeatures, [id]: on === true } });
    return ok(undefined);
  });

  ipcMain.handle(IPC.settingsSetReminder, async (_e, time: string | null): Promise<Result<void>> => {
    if (time !== null && !isReminderTime(time)) return err('Pick a time like 21:00');
    await updateSettings({ reminderTime: time ?? undefined });
    reminders.set(time ?? undefined);
    return ok(undefined);
  });

  ipcMain.handle(IPC.settingsCompleteOnboarding, async () => {
    await updateSettings({ onboarded: true, vaultPath: getPath() });
  });
}
