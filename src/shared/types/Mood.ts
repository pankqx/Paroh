export type Mood = 'low' | 'sad' | 'meh' | 'ok' | 'good';

export const MOODS: readonly Mood[] = ['low', 'sad', 'meh', 'ok', 'good'];

export function isMood(value: unknown): value is Mood {
  return typeof value === 'string' && (MOODS as readonly string[]).includes(value);
}
