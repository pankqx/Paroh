import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type ParohApi } from '../shared/ipc-contract';

// The renderer's only door to the vault: explicit methods, no generic invoke (docs/api.md).
const api: ParohApi = {
  entries: {
    save: (entry) => ipcRenderer.invoke(IPC.entriesSave, entry),
    load: (date) => ipcRenderer.invoke(IPC.entriesLoad, date),
    delete: (date) => ipcRenderer.invoke(IPC.entriesDelete, date),
    list: (range) => ipcRenderer.invoke(IPC.entriesList, range),
  },
  vault: {
    info: () => ipcRenderer.invoke(IPC.vaultInfo),
    choose: () => ipcRenderer.invoke(IPC.vaultChoose),
  },
};

contextBridge.exposeInMainWorld('paroh', api);
