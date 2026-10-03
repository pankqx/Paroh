import type { Task } from '../../shared/types/Task';
import { formatShortDate, fromEntryDate } from './dates';

export interface TaskGroups {
  /** Unfinished from an earlier day: shown once, at the top of Today, with "Did you finish this?". */
  nudges: Task[];
  today: Task[];
  upcoming: Task[];
  someday: Task[];
  done: Task[];
}

export function isOverdue(task: Task, today: string): boolean {
  return !task.done && task.dueDate !== undefined && task.dueDate < today;
}

export function groupTasks(tasks: Task[], today: string): TaskGroups {
  const groups: TaskGroups = { nudges: [], today: [], upcoming: [], someday: [], done: [] };
  for (const t of tasks) {
    if (t.done) groups.done.push(t);
    else if (isOverdue(t, today)) groups.nudges.push(t);
    else if (t.dueDate === today) groups.today.push(t);
    else if (t.dueDate) groups.upcoming.push(t);
    else groups.someday.push(t);
  }
  const byDue = (a: Task, b: Task) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || a.createdDate.localeCompare(b.createdDate);
  groups.nudges.sort(byDue);
  groups.today.sort(byPriority);
  groups.upcoming.sort(byDue);
  groups.done.sort((a, b) => (b.doneDate ?? '').localeCompare(a.doneDate ?? ''));
  return groups;
}

export type DeadlineTone = 'overdue' | 'today' | 'soon' | 'later';

/** How a deadline reads on a task card: "2 days late", "Today", "Tomorrow", "Fri", or "Oct 21". */
export function deadline(due: string, today: string): { text: string; tone: DeadlineTone } {
  const days = Math.round((fromEntryDate(due).getTime() - fromEntryDate(today).getTime()) / 86_400_000);
  if (days < 0) return { text: days === -1 ? 'Yesterday' : `${-days} days late`, tone: 'overdue' };
  if (days === 0) return { text: 'Today', tone: 'today' };
  if (days === 1) return { text: 'Tomorrow', tone: 'soon' };
  if (days < 7) return { text: fromEntryDate(due).toLocaleDateString(undefined, { weekday: 'long' }), tone: 'soon' };
  return { text: formatShortDate(due), tone: 'later' };
}

/** Today's progress: what is done today out of what was due today (plus anything late). */
export function todayProgress(tasks: Task[], today: string): { done: number; total: number } {
  const relevant = tasks.filter((t) => (t.done ? t.doneDate === today : t.dueDate !== undefined && t.dueDate <= today));
  return { done: relevant.filter((t) => t.done).length, total: relevant.length };
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

/** Within a day, high priority first. */
export function byPriority(a: Task, b: Task): number {
  return (a.priority ? PRIORITY_RANK[a.priority] : 1.5) - (b.priority ? PRIORITY_RANK[b.priority] : 1.5);
}
