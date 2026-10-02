import { addDays, weekday } from './localDate';
import type { Recurrence } from './types/Task';

/** The next scheduled date strictly after `after`. Works across month and year boundaries by construction. */
export function nextOccurrence(recurring: Recurrence, after: string): string {
  if (recurring === 'weekly') return addDays(after, 7);
  let next = addDays(after, 1);
  if (recurring === 'weekdays') while (weekday(next) === 0 || weekday(next) === 6) next = addDays(next, 1);
  return next;
}
