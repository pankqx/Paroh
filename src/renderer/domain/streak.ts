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

/** The longest run of scheduled days kept, ever (days off between don't break it). */
export function bestStreak(habit: Habit, done: Set<string>, today: string): number {
  let best = 0;
  let run = 0;
  const first = [...done].sort()[0];
  for (let date = first && first < habit.createdAt ? first : habit.createdAt; date <= today; date = addDays(date, 1)) {
    if (done.has(date)) best = Math.max(best, ++run);
    else if (isScheduled(habit, date) && date !== today) run = 0;
  }
  return best;
}

/** Share of scheduled days kept in the last `days` days (today counts only once done). 0–1. */
export function keptRate(habit: Habit, done: Set<string>, today: string, days = 30): number {
  let scheduled = 0;
  let kept = 0;
  for (let i = 0; i < days; i++) {
    const date = addDays(today, -i);
    if (date < habit.createdAt) break;
    if (!isScheduled(habit, date) || (date === today && !done.has(date))) continue;
    scheduled++;
    if (done.has(date)) kept++;
  }
  return scheduled ? kept / scheduled : 0;
}
