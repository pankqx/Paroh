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
  habits: {
    list: () => ipcRenderer.invoke(IPC.habitsList),
    create: (input) => ipcRenderer.invoke(IPC.habitsCreate, input),
    update: (id, input) => ipcRenderer.invoke(IPC.habitsUpdate, id, input),
    setArchived: (id, archived) => ipcRenderer.invoke(IPC.habitsSetArchived, id, archived),
    toggleToday: (id) => ipcRenderer.invoke(IPC.habitsToggleToday, id),
    history: () => ipcRenderer.invoke(IPC.habitsHistory),
  },
  tasks: {
    list: () => ipcRenderer.invoke(IPC.tasksList),
    create: (input) => ipcRenderer.invoke(IPC.tasksCreate, input),
    update: (id, input) => ipcRenderer.invoke(IPC.tasksUpdate, id, input),
    toggle: (id) => ipcRenderer.invoke(IPC.tasksToggle, id),
    resolveNudge: (id, action, reflection) => ipcRenderer.invoke(IPC.tasksResolveNudge, id, action, reflection),
    remove: (id) => ipcRenderer.invoke(IPC.tasksRemove, id),
  },
  audio: {
    begin: () => ipcRenderer.invoke(IPC.audioBegin),
    append: (id, chunk) => ipcRenderer.invoke(IPC.audioAppend, id, chunk),
    finish: (id, durationSeconds) => ipcRenderer.invoke(IPC.audioFinish, id, durationSeconds),
    list: () => ipcRenderer.invoke(IPC.audioList),
    read: (id) => ipcRenderer.invoke(IPC.audioRead, id),
    rename: (id, title) => ipcRenderer.invoke(IPC.audioRename, id, title),
  },
  prompts: {
    history: () => ipcRenderer.invoke(IPC.promptsHistory),
  },
  chapters: {
    month: (month) => ipcRenderer.invoke(IPC.chaptersMonth, month),
  },
  horizons: {
    list: () => ipcRenderer.invoke(IPC.horizonsList),
    save: (input, id) => ipcRenderer.invoke(IPC.horizonsSave, input, id),
    remove: (id) => ipcRenderer.invoke(IPC.horizonsRemove, id),
    addArea: (name) => ipcRenderer.invoke(IPC.horizonsAddArea, name),
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.settingsGet),
    setAiFeature: (id, on) => ipcRenderer.invoke(IPC.settingsSetAiFeature, id, on),
    setReminder: (time) => ipcRenderer.invoke(IPC.settingsSetReminder, time),
    completeOnboarding: () => ipcRenderer.invoke(IPC.settingsCompleteOnboarding),
  },
  vault: {
    info: () => ipcRenderer.invoke(IPC.vaultInfo),
    choose: () => ipcRenderer.invoke(IPC.vaultChoose),
    confirmChoice: () => ipcRenderer.invoke(IPC.vaultConfirmChoice),
    reveal: () => ipcRenderer.invoke(IPC.vaultReveal),
    export: () => ipcRenderer.invoke(IPC.vaultExport),
    import: () => ipcRenderer.invoke(IPC.vaultImport),
    onExportProgress: (listener) => {
      const handler = (_e: IpcRendererEvent, p: { done: number; total: number }) => listener(p);
      ipcRenderer.on(IPC.vaultExportProgress, handler);
      return () => ipcRenderer.removeListener(IPC.vaultExportProgress, handler);
    },
    onChanged: (listener) => {
      const handler = (_e: IpcRendererEvent, change: VaultChange) => listener(change);
      ipcRenderer.on(IPC.vaultChanged, handler);
      return () => ipcRenderer.removeListener(IPC.vaultChanged, handler);
    },
  },
};

contextBridge.exposeInMainWorld('paroh', api);
