import { ipcMain } from 'electron';
import { IPC, type HabitInput, type TaskInput } from '../../shared/ipc-contract';
import type { LifeStoryInput } from '../../shared/types/LifeStory';
import { err } from '../../shared/types/Result';
import { aiFeatureEnabled } from '../ai/aiFeatureEnabled';
import type { NudgeAction } from '../../shared/types/Task';
import type { AudioStore } from '../stores/AudioStore';
import type { HabitStore } from '../stores/HabitStore';
import type { HorizonStore } from '../stores/HorizonStore';
import type { MediaStore } from '../stores/MediaStore';
import type { TaskStore } from '../stores/TaskStore';

export interface DailyStores {
  habits: HabitStore;
  tasks: TaskStore;
  audio: AudioStore;
  horizons: HorizonStore;
  media: MediaStore;
}

/** Habits, tasks, audio (feature-specifications.md §6–8) and Horizons (§10): the stores beside the entries. */
export function registerDailyIpc(stores: () => DailyStores): void {
  ipcMain.handle(IPC.habitsList, () => stores().habits.list());
  ipcMain.handle(IPC.habitsCreate, (_e, input: HabitInput) => stores().habits.create(input));
  ipcMain.handle(IPC.habitsUpdate, (_e, id: string, input: HabitInput) => stores().habits.update(id, input));
  ipcMain.handle(IPC.habitsSetArchived, (_e, id: string, archived: boolean) => stores().habits.setArchived(id, Boolean(archived)));
  ipcMain.handle(IPC.habitsToggleToday, (_e, id: string) => stores().habits.toggleToday(id));

  ipcMain.handle(IPC.horizonsList, () => stores().horizons.list());
  ipcMain.handle(IPC.horizonsSave, (_e, input: LifeStoryInput, id?: string) => stores().horizons.save(input, id ?? undefined));
  ipcMain.handle(IPC.horizonsRemove, (_e, id: string) => stores().horizons.remove(id));
  ipcMain.handle(IPC.horizonsAddArea, (_e, name: string) => stores().horizons.addArea(name));

  ipcMain.handle(IPC.tasksList, () => stores().tasks.list());
  ipcMain.handle(IPC.tasksCreate, (_e, input: TaskInput) => stores().tasks.create(input));
  ipcMain.handle(IPC.tasksUpdate, (_e, id: string, input: TaskInput) => stores().tasks.update(id, input));
  ipcMain.handle(IPC.tasksToggle, (_e, id: string) => stores().tasks.toggle(id));
  ipcMain.handle(IPC.tasksResolveNudge, (_e, id: string, action: NudgeAction, reflection?: string) => stores().tasks.resolveNudge(id, action, reflection));
  ipcMain.handle(IPC.tasksRemove, (_e, id: string) => stores().tasks.remove(id));

  ipcMain.handle(IPC.mediaSave, (_e, fileName: string, bytes: Uint8Array) => stores().media.save(String(fileName ?? ''), bytes));
  ipcMain.handle(IPC.mediaRead, (_e, path: string) => stores().media.read(String(path ?? '')));
  ipcMain.handle(IPC.audioBegin, () => stores().audio.begin());
  ipcMain.handle(IPC.audioAppend, (_e, id: string, chunk: Uint8Array) => stores().audio.append(id, chunk));
  ipcMain.handle(IPC.audioFinish, (_e, id: string, seconds: number) => stores().audio.finish(id, Number(seconds) || 0));
  ipcMain.handle(IPC.audioList, () => stores().audio.list());
  ipcMain.handle(IPC.audioRead, (_e, id: string) => stores().audio.read(id));
  ipcMain.handle(IPC.audioRename, (_e, id: string, title: string) => stores().audio.rename(id, String(title ?? '')));
  ipcMain.handle(IPC.audioSetTranscript, async (_e, id: string, text: string) => {
    const clean = String(text ?? '');
    // Removing a transcript is always allowed; adding one only while transcription is switched on.
    if (clean.trim() && !(await aiFeatureEnabled('transcription'))) return err('Transcription is switched off in Settings.');
    return stores().audio.setTranscript(id, clean);
  });
}
