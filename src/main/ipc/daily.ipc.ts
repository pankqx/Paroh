import { ipcMain } from 'electron';
import { IPC, type HabitInput, type TaskInput } from '../../shared/ipc-contract';
import type { NudgeAction } from '../../shared/types/Task';
import type { AudioStore } from '../stores/AudioStore';
import type { HabitStore } from '../stores/HabitStore';
import type { TaskStore } from '../stores/TaskStore';

export interface DailyStores {
  habits: HabitStore;
  tasks: TaskStore;
  audio: AudioStore;
}

/** Habits, tasks and audio: the daily-practice stores (feature-specifications.md §6–8). */
export function registerDailyIpc(stores: () => DailyStores): void {
  ipcMain.handle(IPC.habitsList, () => stores().habits.list());
  ipcMain.handle(IPC.habitsCreate, (_e, input: HabitInput) => stores().habits.create(input));
  ipcMain.handle(IPC.habitsUpdate, (_e, id: string, input: HabitInput) => stores().habits.update(id, input));
  ipcMain.handle(IPC.habitsSetArchived, (_e, id: string, archived: boolean) => stores().habits.setArchived(id, Boolean(archived)));
  ipcMain.handle(IPC.habitsToggleToday, (_e, id: string) => stores().habits.toggleToday(id));

  ipcMain.handle(IPC.tasksList, () => stores().tasks.list());
  ipcMain.handle(IPC.tasksCreate, (_e, input: TaskInput) => stores().tasks.create(input));
  ipcMain.handle(IPC.tasksUpdate, (_e, id: string, input: TaskInput) => stores().tasks.update(id, input));
  ipcMain.handle(IPC.tasksToggle, (_e, id: string) => stores().tasks.toggle(id));
  ipcMain.handle(IPC.tasksResolveNudge, (_e, id: string, action: NudgeAction, reflection?: string) => stores().tasks.resolveNudge(id, action, reflection));
  ipcMain.handle(IPC.tasksRemove, (_e, id: string) => stores().tasks.remove(id));

  ipcMain.handle(IPC.audioBegin, () => stores().audio.begin());
  ipcMain.handle(IPC.audioAppend, (_e, id: string, chunk: Uint8Array) => stores().audio.append(id, chunk));
  ipcMain.handle(IPC.audioFinish, (_e, id: string, seconds: number) => stores().audio.finish(id, Number(seconds) || 0));
  ipcMain.handle(IPC.audioList, () => stores().audio.list());
  ipcMain.handle(IPC.audioRead, (_e, id: string) => stores().audio.read(id));
  ipcMain.handle(IPC.audioRename, (_e, id: string, title: string) => stores().audio.rename(id, String(title ?? '')));
}
