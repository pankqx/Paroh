import { addDays, fromEntryDate, toEntryDate } from '../../shared/localDate';
import type { PlanEvent } from '../../shared/types/Planner';

/** Plans that touch a day: spans first (they read as the day's backdrop), then by time. */
export function eventsOn(events: PlanEvent[], date: string): PlanEvent[] {
  return events
    .filter((e) => e.start <= date && (e.end ?? e.start) >= date)
    .sort((a, b) => Number(Boolean(b.end)) - Number(Boolean(a.end)) || (a.time ?? '99').localeCompare(b.time ?? '99') || a.title.localeCompare(b.title));
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  return toEntryDate(new Date(y, m - 1 + by, 1)).slice(0, 7);
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function dayOfYear(date: string): number {
  const d = fromEntryDate(date);
  return Math.round((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86_400_000);
}

export function daysInYear(year: number): number {
  return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
}

export interface Span {
  event: PlanEvent;
  /** Day of the year the bar starts and ends on, clipped to this year. */
  from: number;
  to: number;
  lane: number;
}

/**
 * Lays plans out on the year ribbon: each gets the first lane where it doesn't overlap another,
 * like cars finding a free lane. `labelDays` is how many days a plan's name needs on the ribbon.
 */
export function yearSpans(events: PlanEvent[], year: number, labelDays: (e: PlanEvent) => number = () => 2): Span[] {
  const first = `${year}-01-01`;
  const last = `${year}-12-31`;
  const inYear = events.filter((e) => e.start <= last && (e.end ?? e.start) >= first).sort((a, b) => a.start.localeCompare(b.start) || (b.end ?? b.start).localeCompare(a.end ?? a.start));
  const laneEnds: number[] = [];
  return inYear.map((event) => {
    const from = dayOfYear(event.start < first ? first : event.start);
    const to = dayOfYear((event.end ?? event.start) > last ? last : (event.end ?? event.start));
    let lane = laneEnds.findIndex((end) => end < from - 1);
    if (lane === -1) lane = laneEnds.length;
    // A short plan's name runs past its bar, so its lane stays taken until the name ends.
    laneEnds[lane] = Math.max(to, from + labelDays(event));
    return { event, from, to, lane };
  });
}

/** Days from `start` to `end` inclusive. */
export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Rows for one calendar week, so a multi-day plan keeps the same row in every cell it crosses.
 * Spans claim rows first (earliest, then longest); single-day plans fill the gaps left in their own cell.
 * Each day gets its plans by row, with `null` holes where another day's span sits.
 */
export function weekRows(events: PlanEvent[], week: string[]): Map<string, (PlanEvent | null)[]> {
  const first = week[0];
  const last = week[week.length - 1];
  const spans = events.filter((e) => e.end && e.start <= last && e.end >= first).sort((a, b) => a.start.localeCompare(b.start) || b.end!.localeCompare(a.end!) || a.title.localeCompare(b.title));
  const rows = new Map(week.map((d) => [d, [] as (PlanEvent | null)[]]));
  for (const span of spans) {
    const days = week.filter((d) => d >= span.start && d <= span.end!);
    let lane = 0;
    while (days.some((d) => rows.get(d)![lane])) lane++;
    for (const d of days) rows.get(d)![lane] = span;
  }
  for (const d of week) {
    const row = rows.get(d)!;
    const singles = eventsOn(events, d).filter((e) => !e.end);
    let lane = 0;
    for (const e of singles) {
      while (row[lane]) lane++;
      row[lane] = e;
    }
    rows.set(
      d,
      Array.from(row, (e) => e ?? null),
    );
  }
  return rows;
}
