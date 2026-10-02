import { addDays, fromEntryDate, toEntryDate } from '../../shared/localDate';
import { markdownToPlainText } from '../../shared/plainText';
import type { Entry } from '../../shared/types/Entry';
import { MOODS, type Mood } from '../../shared/types/Mood';
import { topWords, type WordCount } from './wordFrequency';

export interface ChapterWeek {
  index: number; // 1-based within the month
  from: string; // clipped to the month
  to: string;
  moods: Mood[];
}

/** Chapters are computed, never stored (feature-specifications.md §11). */
export interface ChapterSummary {
  month: string; // YYYY-MM
  entryCount: number; // days with written words
  daysLogged: number; // days with any entry, including a mood alone
  longestStreak: number; // consecutive logged days within the month
  weeks: ChapterWeek[];
  moodByWeek: Mood[][];
  topWord: string | null;
  topWords: WordCount[];
  moodDays: { date: string; mood: Mood; value: number }[];
}

export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  return { from: `${month}-01`, to: toEntryDate(new Date(y, m, 0)) };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  return toEntryDate(new Date(y, m - 1 + delta, 1)).slice(0, 7);
}

export function formatMonth(month: string): string {
  return fromEntryDate(`${month}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export const moodValue = (mood: Mood): number => MOODS.indexOf(mood) + 1;

/** Monday-first weeks touching the month, clipped to it. */
export function monthWeeks(month: string): { from: string; to: string }[] {
  const { from, to } = monthRange(month);
  const weeks: { from: string; to: string }[] = [];
  let start = from;
  while (start <= to) {
    const offset = (fromEntryDate(start).getDay() + 6) % 7; // days since Monday
    const end = addDays(start, 6 - offset);
    weeks.push({ from: start, to: end > to ? to : end });
    start = addDays(end, 1);
  }
  return weeks;
}

export function chapterSummary(month: string, entries: readonly Entry[]): ChapterSummary {
  const { from, to } = monthRange(month);
  const inMonth = entries.filter((e) => e.date >= from && e.date <= to).sort((a, b) => a.date.localeCompare(b.date));
  const dates = inMonth.map((e) => e.date);

  let longestStreak = 0;
  let run = 0;
  for (let i = 0; i < dates.length; i++) {
    run = i > 0 && addDays(dates[i - 1], 1) === dates[i] ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
  }

  const moodDays = inMonth.filter((e): e is Entry & { mood: Mood } => Boolean(e.mood)).map((e) => ({ date: e.date, mood: e.mood, value: moodValue(e.mood) }));
  const weeks = monthWeeks(month).map((w, i) => ({ index: i + 1, ...w, moods: moodDays.filter((d) => d.date >= w.from && d.date <= w.to).map((d) => d.mood) }));
  const words = topWords(inMonth.map((e) => e.body));

  return {
    month,
    entryCount: inMonth.filter((e) => markdownToPlainText(e.body).length > 0).length,
    daysLogged: inMonth.length,
    longestStreak,
    weeks,
    moodByWeek: weeks.map((w) => w.moods),
    topWord: words[0]?.word ?? null,
    topWords: words,
    moodDays,
  };
}

/** One plain-language line for a week's moods, e.g. "mostly ok" or "mixed, from low to good". */
export function describeWeek(moods: readonly Mood[]): string {
  if (moods.length === 0) return 'no mood logged';
  const values = moods.map(moodValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min >= 2) return `mixed, from ${MOODS[min - 1]} to ${MOODS[max - 1]}`;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return `mostly ${MOODS[Math.round(avg) - 1]}`;
}

/** The text equivalent of the mood landscape for screen readers (§11 Accessibility). */
export function describeLandscape(weeks: readonly ChapterWeek[]): string {
  const withMood = weeks.filter((w) => w.moods.length);
  if (withMood.length === 0) return 'No moods logged this month.';
  const parts = weeks.map((w) => `Week ${w.index}: ${describeWeek(w.moods)}.`);
  if (withMood.length > 1) {
    const avg = (w: ChapterWeek) => w.moods.map(moodValue).reduce((a, b) => a + b, 0) / w.moods.length;
    const first = withMood[0];
    const last = withMood[withMood.length - 1];
    const diff = avg(last) - avg(first);
    parts.push(diff >= 0.75 ? `Trending up by week ${last.index}.` : diff <= -0.75 ? `Dipping by week ${last.index}.` : 'Fairly steady overall.');
  }
  return parts.join(' ');
}

/** The week with the lowest average mood, if at least two weeks have moods to compare. */
export function hardestWeek(weeks: readonly ChapterWeek[]): ChapterWeek | null {
  const withMood = weeks.filter((w) => w.moods.length);
  if (withMood.length < 2) return null;
  const avg = (w: ChapterWeek) => w.moods.map(moodValue).reduce((a, b) => a + b, 0) / w.moods.length;
  const lowest = withMood.reduce((a, b) => (avg(b) < avg(a) ? b : a));
  return withMood.every((w) => avg(w) === avg(lowest)) ? null : lowest;
}
