import { fromEntryDate, toEntryDate } from '../../shared/localDate';
import type { LifeStory } from '../../shared/types/LifeStory';

export type Zoom = 'year' | 'quarter';

export interface TimelineColumn {
  key: string;
  label: string;
  from: string;
  to: string;
}

export function periodRange(period: string): { from: string; to: string } {
  const [y, q] = period.split('-Q').map(Number);
  if (!q) return { from: `${y}-01-01`, to: `${y}-12-31` };
  return { from: toEntryDate(new Date(y, (q - 1) * 3, 1)), to: toEntryDate(new Date(y, q * 3, 0)) };
}

/**
 * Where a story sits in time: from `created` to the end of its `when`, or to today when it has
 * no `when`, so an ongoing story ("Learn to paint") stretches to the present by itself (§10 Edge Cases).
 */
export function storySpan(story: LifeStory, today: string): { from: string; to: string } {
  if (!story.when) return story.created <= today ? { from: story.created, to: today } : { from: story.created, to: story.created };
  const when = periodRange(story.when);
  return when.to >= story.created ? { from: story.created, to: when.to } : { from: when.from, to: story.created };
}

/** Whole years from last year (or the earliest story) to a few years past the furthest story. */
export function timelineYears(stories: readonly LifeStory[], today: string): { from: number; to: number } {
  const year = Number(today.slice(0, 4));
  let from = year - 1;
  let to = year + 4;
  for (const s of stories) {
    const span = storySpan(s, today);
    from = Math.min(from, Number(span.from.slice(0, 4)));
    to = Math.max(to, Number(span.to.slice(0, 4)));
  }
  return { from, to };
}

export function timelineColumns(years: { from: number; to: number }, zoom: Zoom): TimelineColumn[] {
  const cols: TimelineColumn[] = [];
  for (let y = years.from; y <= years.to; y++) {
    if (zoom === 'year') cols.push({ key: String(y), label: String(y), ...periodRange(String(y)) });
    else for (let q = 1; q <= 4; q++) cols.push({ key: `${y}-Q${q}`, label: `Q${q} ${y}`, ...periodRange(`${y}-Q${q}`) });
  }
  return cols;
}

/** Position of a date across the timeline as a fraction 0…1, by days, so every day has the same width. */
export function timelineFraction(date: string, years: { from: number; to: number }): number {
  const start = new Date(years.from, 0, 1).getTime();
  const end = new Date(years.to + 1, 0, 1).getTime();
  return (fromEntryDate(date).getTime() - start) / (end - start);
}

/** Greedy lanes so bands in one row never overlap: each band takes the first lane free at its left edge. */
export function assignLanes(spans: readonly { left: number; right: number }[]): number[] {
  const order = spans.map((s, i) => ({ ...s, i })).sort((a, b) => a.left - b.left);
  const laneEnds: number[] = [];
  const lanes = new Array<number>(spans.length);
  for (const s of order) {
    let lane = laneEnds.findIndex((end) => end <= s.left);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = s.right;
    lanes[s.i] = lane;
  }
  return lanes;
}
