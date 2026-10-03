import { markdownToPlainText } from '../../shared/plainText';
import type { Entry } from '../../shared/types/Entry';
import type { MonthDigest } from './AIProvider';

/** Days with nothing written, no mood and no tags carry nothing worth sending, so they are left out. */
export function buildMonthDigest(month: string, entries: Entry[]): MonthDigest {
  return {
    month,
    entries: entries
      .filter((e) => e.date.startsWith(`${month}-`))
      .map((e) => ({ date: e.date, title: e.title, ...(e.mood ? { mood: e.mood } : {}), tags: e.tags, text: markdownToPlainText(e.body).trim() }))
      .filter((e) => e.text || e.mood || e.tags.length)
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
  };
}
