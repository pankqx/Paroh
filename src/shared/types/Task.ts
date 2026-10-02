export type Recurrence = 'daily' | 'weekdays' | 'weekly';

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
}

export type NudgeAction = 'done' | 'moveToday' | 'reflect';
