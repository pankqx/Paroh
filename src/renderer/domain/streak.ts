import { addDays, weekday } from '../../shared/localDate';
import type { Habit, HabitDay } from '../../shared/types/Habit';

export function isScheduled(habit: Habit, date: string): boolean {
  const day = weekday(date);
  if (habit.frequency === 'weekdays') return day >= 1 && day <= 5;
  if (habit.frequency === 'custom') return habit.customDays?.includes(day) ?? false;
  return true;
}

/** Dates on which this habit was completed. */
export function completedDates(habitId: string, history: HabitDay[]): Set<string> {
  return new Set(history.filter((d) => d.habits.includes(habitId)).map((d) => d.date));
}

/**
 * Consecutive scheduled days completed, counting back from today. Today only counts once it is done;
 * an unfinished today never breaks the streak, because the day isn't over (no guilt by design).
 */
export function computeStreak(habit: Habit, done: Set<string>, today: string): number {
  let streak = 0;
  let date = today;
  if (!done.has(today)) date = addDays(today, -1);
  for (let guard = 0; guard < 3660; guard++) {
    if (date < habit.createdAt && !done.has(date)) break;
    if (isScheduled(habit, date)) {
      if (!done.has(date)) break;
      streak++;
    } else if (done.has(date)) {
      streak++;
    }
    date = addDays(date, -1);
  }
  return streak;
}

/** Monday-first weeks ending with the week containing `today`, for a contributions-style heatmap. */
export function heatmapWeeks(today: string, weeks: number): string[][] {
  const offset = (weekday(today) + 6) % 7;
  const start = addDays(today, -offset - (weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
}
