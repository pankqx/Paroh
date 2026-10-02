import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC, type ParohApi, type VaultChange } from '../shared/ipc-contract';

// The renderer's only door to the vault: explicit methods, no generic invoke (docs/api.md).
const api: ParohApi = {
  entries: {
    save: (entry) => ipcRenderer.invoke(IPC.entriesSave, entry),
    load: (date) => ipcRenderer.invoke(IPC.entriesLoad, date),
    delete: (date) => ipcRenderer.invoke(IPC.entriesDelete, date),
    list: (range) => ipcRenderer.invoke(IPC.entriesList, range),
    backlinks: (date) => ipcRenderer.invoke(IPC.entriesBacklinks, date),
    resolveLink: (target) => ipcRenderer.invoke(IPC.entriesResolveLink, target),
  },
  search: {
    query: (text, filters) => ipcRenderer.invoke(IPC.searchQuery, text, filters),
    tags: () => ipcRenderer.invoke(IPC.searchTags),
    rebuildIndex: () => ipcRenderer.invoke(IPC.searchRebuildIndex),
  },
  vault: {
    info: () => ipcRenderer.invoke(IPC.vaultInfo),
    choose: () => ipcRenderer.invoke(IPC.vaultChoose),
    onChanged: (listener) => {
      const handler = (_e: IpcRendererEvent, change: VaultChange) => listener(change);
      ipcRenderer.on(IPC.vaultChanged, handler);
      return () => ipcRenderer.removeListener(IPC.vaultChanged, handler);
    },
  },
};

contextBridge.exposeInMainWorld('paroh', api);
