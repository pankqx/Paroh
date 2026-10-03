import type { Mood } from '../../shared/types/Mood';

/** Hand-mixed gradient covers, for pages without a photo. Stored in frontmatter as `cover: gradient:<id>`. */
export const GRADIENT_COVERS = [
  { id: 'dawn', label: 'Dawn', css: 'linear-gradient(135deg, #f6d5b8 0%, #e89a72 45%, #8c4a5c 100%)' },
  { id: 'ember', label: 'Ember', css: 'radial-gradient(120% 140% at 80% 100%, #f2a65a 0%, #c4502a 40%, #2b1712 100%)' },
  { id: 'meadow', label: 'Meadow', css: 'linear-gradient(160deg, #e7ecd2 0%, #9fbf8a 45%, #3e6b4f 100%)' },
  { id: 'tide', label: 'Tide', css: 'linear-gradient(160deg, #dfe9ec 0%, #8fb5c2 45%, #2c4f63 100%)' },
  { id: 'dusk', label: 'Dusk', css: 'linear-gradient(150deg, #e9d6e8 0%, #a98bbf 45%, #3d2f5c 100%)' },
  { id: 'ink', label: 'Ink', css: 'radial-gradient(120% 120% at 20% 0%, #4b4a3c 0%, #1f1d18 60%, #0f0e0b 100%)' },
  { id: 'gold', label: 'Gold leaf', css: 'linear-gradient(135deg, #f5e7c0 0%, #d8b46a 40%, #8a6424 100%)' },
  { id: 'paper', label: 'Paper', css: 'linear-gradient(180deg, #f8f3e8 0%, #ebe1cc 100%)' },
] as const;

export type GradientId = (typeof GRADIENT_COVERS)[number]['id'];

export function gradientCss(cover: string | undefined): string | null {
  if (!cover?.startsWith('gradient:')) return null;
  return GRADIENT_COVERS.find((g) => `gradient:${g.id}` === cover)?.css ?? GRADIENT_COVERS[0].css;
}

/** Light covers need dark title text; everything else gets white text over a scrim. */
export function isLightCover(cover: string | undefined): boolean {
  return cover === 'gradient:paper';
}

/** A cover that suits the day's mood, used by "Make it beautiful" when a page has none. */
export function coverForMood(mood: Mood | undefined): string {
  const byMood: Record<Mood, GradientId> = { low: 'tide', sad: 'dusk', meh: 'paper', ok: 'meadow', good: 'dawn' };
  return `gradient:${mood ? byMood[mood] : 'ember'}`;
}
