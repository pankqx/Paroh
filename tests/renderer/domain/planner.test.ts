import { describe, expect, it } from 'vitest';
import { dayOfYear, daysInMonth, daysInYear, eventsOn, shiftMonth, weekRows, yearSpans } from '../../../src/renderer/domain/planner';
import type { PlanEvent } from '../../../src/shared/types/Planner';

const ev = (id: string, start: string, end?: string, time?: string): PlanEvent => ({ id, title: id, start, end, time, area: 'personal' });

describe('planner dates', () => {
  it('moves between months across years and knows their length', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInYear(2028)).toBe(366);
    expect(dayOfYear('2026-01-01')).toBe(0);
    expect(dayOfYear('2026-12-31')).toBe(364);
  });

  it('lists a day’s plans with spans first, then by time', () => {
    const plans = [ev('lunch', '2026-10-05', undefined, '12:30'), ev('trip', '2026-10-04', '2026-10-06'), ev('call', '2026-10-05', undefined, '09:00'), ev('other', '2026-10-06')];
    expect(eventsOn(plans, '2026-10-05').map((e) => e.id)).toEqual(['trip', 'call', 'lunch']);
  });
});

describe('yearSpans', () => {
  it('puts overlapping plans in separate lanes and reuses free lanes', () => {
    const spans = yearSpans([ev('a', '2026-03-01', '2026-03-20'), ev('b', '2026-03-10', '2026-03-12'), ev('c', '2026-04-01')], 2026);
    expect(spans.map((s) => [s.event.id, s.lane])).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 0],
    ]);
  });

  it('clips plans that run over the year’s edges and ignores other years', () => {
    const spans = yearSpans([ev('nye', '2025-12-30', '2026-01-02'), ev('old', '2024-05-01')], 2026);
    expect(spans).toHaveLength(1);
    expect(spans[0]).toMatchObject({ from: 0, to: 1 });
  });
});

describe('weekRows', () => {
  const week = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'];
  it('keeps a multi-day plan on one row across the week and fills gaps with single days', () => {
    const rows = weekRows([ev('month', '2026-10-01', '2026-10-31'), ev('trip', '2026-10-12', '2026-10-15'), ev('bday', '2026-10-18')], week);
    const ids = (d: string) => rows.get(d)!.map((e) => e?.id ?? null);
    expect(ids('2026-10-12')).toEqual(['month', 'trip']);
    expect(ids('2026-10-16')).toEqual(['month']);
    expect(ids('2026-10-18')).toEqual(['month', 'bday']);
  });

  it('leaves a hole where a span sits above another day’s plan', () => {
    const rows = weekRows([ev('a', '2026-10-12', '2026-10-13'), ev('b', '2026-10-13', '2026-10-14')], week);
    expect(rows.get('2026-10-14')!.map((e) => e?.id ?? null)).toEqual([null, 'b']);
  });
});
