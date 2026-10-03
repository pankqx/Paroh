import type { Mood } from '../../shared/types/Mood';
import type { Result } from '../../shared/types/Result';

/**
 * The AI seam from architecture.md §AI Integration & Privacy. Each feature gets its own narrow binding,
 * so turning one on can never quietly route another feature's data anywhere.
 */

/** Exactly what the Editor's Note sends: one month's entry text, moods and tags. No audio, no other months. */
export interface MonthDigest {
  month: string; // YYYY-MM
  entries: { date: string; title: string; mood?: Mood; tags: string[]; text: string }[];
}

export interface NarrativeProvider {
  /** The model name shown next to a saved note. */
  readonly model: string;
  editorsNote(digest: MonthDigest, signal?: AbortSignal): Promise<Result<string>>;
}
