import type { DateRange } from './Entry';
import type { Mood } from './Mood';

export interface SearchFilters {
  tags?: string[];
  mood?: Mood;
  range?: Partial<DateRange>;
}

export interface SearchResult {
  date: string;
  title: string;
  mood?: Mood;
  tags: string[];
  /** Plain text with matched terms wrapped in \u0002 … \u0003, so the renderer can highlight without parsing HTML. */
  snippet: string;
}

export interface Backlink {
  date: string;
  title: string;
}

export const MATCH_START = '\u0002';
export const MATCH_END = '\u0003';
