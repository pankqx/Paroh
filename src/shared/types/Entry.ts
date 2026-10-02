import type { Mood } from './Mood';

export const CURRENT_SCHEMA_VERSION = 1;

/**
 * One journal entry, one file per day: `<vault>/YYYY-MM/YYYY-MM-DD.md`.
 * Fields follow feature-specifications.md §4 and §5. Unknown frontmatter keys are preserved on save via `extra`.
 */
export interface Entry {
  schema_version: number;
  date: string; // YYYY-MM-DD, also the filename
  title: string;
  mood?: Mood;
  tags: string[];
  visibility: 'private' | 'public';
  habits_snapshot?: string[]; // habit ids completed that day
  audio?: string[]; // vault-relative paths into audio/
  prompt_id?: string; // the healing prompt shown that day
  prompt_skipped?: boolean; // true when that prompt was skipped
  body: string; // Markdown
  extra?: Record<string, unknown>;
}

export interface EntrySummary {
  date: string;
  title: string;
  mood?: Mood;
  tags: string[];
  excerpt: string;
}

export interface DateRange {
  from: string; // inclusive, YYYY-MM-DD
  to: string; // inclusive, YYYY-MM-DD
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isEntryDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function emptyEntry(date: string): Entry {
  return { schema_version: CURRENT_SCHEMA_VERSION, date, title: '', tags: [], visibility: 'private', body: '' };
}
