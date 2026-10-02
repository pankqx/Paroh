import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-contract';
import type { DateRange, Entry } from '../../shared/types/Entry';
import type { SearchFilters } from '../../shared/types/Search';
import type { EntryService } from '../EntryService';

export function registerEntriesIpc(service: () => EntryService): void {
  ipcMain.handle(IPC.entriesSave, (_e, entry: Entry) => service().save(entry));
  ipcMain.handle(IPC.entriesLoad, (_e, date: string) => service().load(date));
  ipcMain.handle(IPC.entriesDelete, (_e, date: string) => service().delete(date));
  ipcMain.handle(IPC.entriesList, (_e, range?: DateRange) => service().list(range));
  ipcMain.handle(IPC.entriesBacklinks, (_e, date: string) => service().backlinks(date));
  ipcMain.handle(IPC.entriesResolveLink, (_e, target: string) => service().resolveLink(String(target)));
  ipcMain.handle(IPC.searchQuery, (_e, text: string, filters?: SearchFilters) => service().search(String(text ?? ''), filters));
  ipcMain.handle(IPC.searchTags, () => service().tags());
  ipcMain.handle(IPC.searchRebuildIndex, () => service().rebuildIndex());
  ipcMain.handle(IPC.habitsHistory, () => service().habitHistory());
  ipcMain.handle(IPC.promptsHistory, () => service().promptHistory());
}
