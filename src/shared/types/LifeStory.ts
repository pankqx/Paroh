/**
 * Horizons: Life Stories, one Markdown file each at `<vault>/horizons/<life_area>/<slug>.md`
 * (folder-structure.md). There is deliberately no progress percentage anywhere in this shape.
 */
export type LifeStoryStatus = 'dreaming' | 'in-motion' | 'living-it' | 'let-go';

export const STORY_STATUSES: readonly { id: LifeStoryStatus; label: string; hint: string }[] = [
  { id: 'dreaming', label: 'Dreaming', hint: 'Something you hope for' },
  { id: 'in-motion', label: 'In motion', hint: 'You have started' },
  { id: 'living-it', label: 'Living it', hint: 'It is part of your life now' },
  { id: 'let-go', label: 'Let go', hint: 'No longer yours to carry, and that is fine' },
];

export const DEFAULT_LIFE_AREAS: readonly string[] = ['career', 'health', 'relationships', 'learning', 'travel', 'finance', 'adventure'];

export interface LifeStory {
  /** `<life_area>/<slug>`, the file's place in the vault. */
  id: string;
  schema_version: number;
  title: string;
  life_area: string;
  status: LifeStoryStatus;
  created: string; // YYYY-MM-DD
  /** Optional: when you picture it happening, `YYYY` or `YYYY-Qn`. Places the story on the timeline. */
  when?: string;
  linked_entries: string[]; // entry dates
  why: string; // the "## Why" section of the body
  extra?: Record<string, unknown>;
}

export type LifeStoryInput = Pick<LifeStory, 'title' | 'life_area' | 'status' | 'created' | 'when' | 'linked_entries' | 'why'>;

export interface HorizonsData {
  areas: string[];
  stories: LifeStory[];
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PERIOD_RE = /^\d{4}(?:-Q[1-4])?$/;

export function isSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 80 && SLUG_RE.test(value);
}

export function isStoryStatus(value: unknown): value is LifeStoryStatus {
  return STORY_STATUSES.some((s) => s.id === value);
}

export function isPeriod(value: unknown): value is string {
  return typeof value === 'string' && PERIOD_RE.test(value);
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/, '') || 'story'
  );
}

export function areaLabel(area: string): string {
  const words = area.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
