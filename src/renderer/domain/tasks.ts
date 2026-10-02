import type { Task } from '../../shared/types/Task';

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
  groups.upcoming.sort(byDue);
  groups.done.sort((a, b) => (b.doneDate ?? '').localeCompare(a.doneDate ?? ''));
  return groups;
}
