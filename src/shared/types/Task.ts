export type Recurrence = 'daily' | 'weekdays' | 'weekly';
export type Priority = 'low' | 'medium' | 'high';

/** A note left on a task over time ("called them, waiting to hear back"). */
export interface TaskComment {
  id: string;
  text: string;
  /** ISO timestamp. */
  at: string;
}

/** Stored in `<vault>/.paroh/tasks.json` (feature-specifications.md §7). No `dueDate` means Someday. */
export interface Task {
  id: string;
  text: string;
  createdDate: string;
  dueDate?: string;
  done: boolean;
  doneDate?: string;
  recurring?: Recurrence;
  carriedOverFrom?: string;
  stallReflection?: string;
  /** A small explanation of the task, in plain text. */
  notes?: string;
  priority?: Priority;
  comments?: TaskComment[];
}

export type NudgeAction = 'done' | 'moveToday' | 'reflect';
