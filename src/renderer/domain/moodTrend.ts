import { addDays } from '../../shared/localDate';
import type { EntrySummary } from '../../shared/types/Entry';
import { MOODS, type Mood } from '../../shared/types/Mood';

export interface MoodPoint {
  date: string;
  mood: Mood;
  /** 1 (low) … 5 (good). */
  value: number;
}

/** Logged moods within the last `days` days (inclusive of today), oldest first. Days without a mood are gaps, not zeros. */
export function moodTrend(entries: EntrySummary[], today: string, days: number): MoodPoint[] {
  const from = addDays(today, -(days - 1));
  return entries
    .filter((e): e is EntrySummary & { mood: Mood } => Boolean(e.mood) && e.date >= from && e.date <= today)
    .map((e) => ({ date: e.date, mood: e.mood, value: MOODS.indexOf(e.mood) + 1 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
