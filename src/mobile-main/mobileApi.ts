import type { ParohApi, VaultChange } from '../shared/ipc-contract';
import { err, ok, type Result } from '../shared/types/Result';
import { MemoryIndex } from '../main/index-db/MemoryIndex';
import { AudioStore } from '../main/stores/AudioStore';
import { HabitStore } from '../main/stores/HabitStore';
import { HorizonStore } from '../main/stores/HorizonStore';
import { MediaStore } from '../main/stores/MediaStore';
import { TaskStore } from '../main/stores/TaskStore';
import { VaultService } from '../main/VaultService';
import type { VaultFs } from '../shared/fs/VaultFs';

const DESKTOP_ONLY = 'This is in the desktop app for now.';
const ONBOARDED_KEY = 'paroh.onboarded';

function desktopOnly<T>(): Promise<Result<T>> {
  return Promise.resolve(err(DESKTOP_ONLY));
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/**
 * The phone's `window.paroh`: the same vault services the desktop's main process runs, called
 * directly instead of over IPC, on Capacitor's filesystem with an in-memory search index.
 * Signatures match `ParohApi` exactly, so the React app runs unchanged.
 */
export async function createMobileApi(fs: VaultFs, version: string): Promise<ParohApi> {
  await fs.mkdir('');
  const service = await VaultService.create(fs, new MemoryIndex());
  const habits = new HabitStore(service);
  const tasks = new TaskStore(fs);
  const audio = new AudioStore(service);
  const horizons = new HorizonStore(fs);
  const media = new MediaStore(fs);
  await audio.syncTranscriptIndex();

  // A sync app may have changed files while Paroh was in the background; catch up when it returns.
  const listeners = new Set<(change: VaultChange) => void>();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const before = service.mtimeSnapshot();
    void service.sync().then(() => {
      const after = service.mtimeSnapshot();
      const dates = [...new Set([...before.keys(), ...after.keys()])].filter((d) => before.get(d) !== after.get(d));
      if (dates.length) for (const l of listeners) l({ dates });
    });
  });

  return {
    platform: 'mobile',
    entries: {
      save: (entry) => service.save(entry),
      load: (date) => service.load(date),
      delete: (date) => service.delete(date),
      list: async (range) => service.list(range),
      backlinks: async (date) => service.backlinks(date),
      resolveLink: async (target) => service.resolveLink(String(target)),
    },
    search: {
      query: async (text, filters) => service.search(String(text ?? ''), filters),
      tags: async () => service.tags(),
      rebuildIndex: () => service.rebuildIndex(),
    },
    habits: {
      list: () => habits.list(),
      create: (input) => habits.create(input),
      update: (id, input) => habits.update(id, input),
      setArchived: (id, archived) => habits.setArchived(id, Boolean(archived)),
      toggleToday: (id) => habits.toggleToday(id),
      history: async () => service.habitHistory(),
    },
    tasks: {
      list: () => tasks.list(),
      create: (input) => tasks.create(input),
      update: (id, input) => tasks.update(id, input),
      toggle: (id) => tasks.toggle(id),
      resolveNudge: (id, action, reflection) => tasks.resolveNudge(id, action, reflection),
      remove: (id) => tasks.remove(id),
    },
    audio: {
      begin: () => audio.begin(),
      append: (id, chunk) => audio.append(id, chunk),
      finish: (id, seconds) => audio.finish(id, Number(seconds) || 0),
      list: () => audio.list(),
      read: (id) => audio.read(id),
      rename: (id, title) => audio.rename(id, String(title ?? '')),
      // Transcribing is desktop-only, but a transcript can still be removed here.
      setTranscript: (id, text) => (String(text ?? '').trim() ? desktopOnly() : audio.setTranscript(id, '')),
    },
    media: {
      save: (fileName, bytes) => media.save(String(fileName ?? ''), bytes),
      read: (path) => media.read(String(path ?? '')),
    },
    prompts: { history: async () => service.promptHistory() },
    chapters: { month: (month) => service.monthEntries(month) },
    horizons: {
      list: () => horizons.list(),
      save: (input, id) => horizons.save(input, id ?? undefined),
      remove: (id) => horizons.remove(id),
      addArea: (name) => horizons.addArea(name),
    },
    settings: {
      get: async () => ({ vaultPath: fs.root, onboarded: readFlag(ONBOARDED_KEY), aiFeatures: {}, version, hasApiKey: false, apiKeyEncrypted: false }),
      setAiFeature: () => desktopOnly(),
      setReminder: () => desktopOnly(),
      completeOnboarding: async () => {
        try {
          localStorage.setItem(ONBOARDED_KEY, '1');
        } catch {
          // Private storage unavailable: onboarding simply shows again next time.
        }
      },
    },
    ai: {
      setApiKey: () => desktopOnly(),
      note: {
        generate: () => desktopOnly(),
        cancel: async () => {},
        load: async () => ok(null),
        save: () => desktopOnly(),
        remove: () => desktopOnly(),
      },
      model: {
        status: async () => ({ state: 'missing' }),
        download: () => desktopOnly(),
        remove: () => desktopOnly(),
        onChanged: () => () => {},
      },
    },
    vault: {
      info: async () => ({ path: fs.root }),
      choose: async () => null,
      confirmChoice: async () => null,
      reveal: async () => fs.root,
      export: () => desktopOnly(),
      import: () => desktopOnly(),
      onExportProgress: () => () => {},
      onChanged: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
  };
}
