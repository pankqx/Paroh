import { addDays } from '../../shared/localDate';

/**
 * Days in a row with an entry, counting back from today. Like habit streaks, an empty today
 * doesn't break it yet, because the day isn't over (ui-rules.md §4, no guilt).
 */
export function journalStreak(dates: Iterable<string>, today: string): number {
  const have = new Set(dates);
  let date = have.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (have.has(date) && streak < 36600) {
    streak++;
    date = addDays(date, -1);
  }
  return streak;
}

/** "Good morning" etc., from the local hour. */
export function greeting(hour: number): string {
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Good night';
}
