import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-contract';
import type { DateRange, Entry } from '../../shared/types/Entry';
import type { VaultAdapter } from '../vault/VaultAdapter';

export function registerEntriesIpc(getVault: () => VaultAdapter): void {
  ipcMain.handle(IPC.entriesSave, (_e, entry: Entry) => getVault().save(entry));
  ipcMain.handle(IPC.entriesLoad, (_e, date: string) => getVault().load(date));
  ipcMain.handle(IPC.entriesDelete, (_e, date: string) => getVault().delete(date));
  ipcMain.handle(IPC.entriesList, (_e, range?: DateRange) => getVault().list(range));
}
