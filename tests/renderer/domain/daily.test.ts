import { describe, expect, it } from 'vitest';
import { completedDates, computeStreak, heatmapWeeks, isScheduled } from '../../../src/renderer/domain/streak';
import { groupTasks } from '../../../src/renderer/domain/tasks';
import { moodTrend } from '../../../src/renderer/domain/moodTrend';
import { nextOccurrence } from '../../../src/shared/recurrence';
import type { Habit } from '../../../src/shared/types/Habit';
import type { Task } from '../../../src/shared/types/Task';

const daily: Habit = { id: 'walk', name: 'Walk', frequency: 'daily', createdAt: '2026-01-01', archived: false };
const weekdays: Habit = { ...daily, frequency: 'weekdays' };

describe('computeStreak', () => {
  const done = (...dates: string[]) => new Set(dates);
  it('counts consecutive days back from today', () => {
    expect(computeStreak(daily, done('2026-10-02', '2026-10-01', '2026-09-30', '2026-09-28'), '2026-10-02')).toBe(3);
  });
  it('does not break the streak just because today is not done yet', () => {
    expect(computeStreak(daily, done('2026-10-01', '2026-09-30'), '2026-10-02')).toBe(2);
  });
  it('skips days the habit is not scheduled on', () => {
    // Fri Oct 2, Thu Oct 1 … Mon Sep 28; weekend Sep 26–27 skipped; Fri Sep 25 done.
    expect(computeStreak(weekdays, done('2026-10-02', '2026-10-01', '2026-09-30', '2026-09-29', '2026-09-28', '2026-09-25'), '2026-10-02')).toBe(6);
  });
  it('is zero with no history', () => {
    expect(computeStreak(daily, done(), '2026-10-02')).toBe(0);
  });
  it('reads completions out of habit history', () => {
    expect(completedDates('walk', [{ date: '2026-10-01', habits: ['walk', 'read'] }, { date: '2026-10-02', habits: ['read'] }])).toEqual(new Set(['2026-10-01']));
  });
});

describe('schedules', () => {
  it('knows weekdays and custom days', () => {
    expect(isScheduled(weekdays, '2026-10-03')).toBe(false); // Saturday
    expect(isScheduled({ ...daily, frequency: 'custom', customDays: [6] }, '2026-10-03')).toBe(true);
  });
  it('builds a Monday-first heatmap ending this week', () => {
    const weeks = heatmapWeeks('2026-10-02', 2);
    expect(weeks[0][0]).toBe('2026-09-21');
    expect(weeks[1][6]).toBe('2026-10-04');
  });
});

describe('groupTasks', () => {
  const t = (id: string, patch: Partial<Task>): Task => ({ id, text: id, createdDate: '2026-09-01', done: false, ...patch });
  it('puts unfinished earlier tasks in nudges once, and sorts the rest by group', () => {
    const g = groupTasks(
      [t('late', { dueDate: '2026-09-29', carriedOverFrom: '2026-09-20' }), t('now', { dueDate: '2026-10-02' }), t('soon', { dueDate: '2026-10-05' }), t('idea', {}), t('fin', { done: true, doneDate: '2026-10-01' })],
      '2026-10-02',
    );
    expect(Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.map((x: Task) => x.id)]))).toEqual({ nudges: ['late'], today: ['now'], upcoming: ['soon'], someday: ['idea'], done: ['fin'] });
  });
});

describe('nextOccurrence', () => {
  it('handles month and year ends', () => {
    expect(nextOccurrence('daily', '2026-12-31')).toBe('2027-01-01');
    expect(nextOccurrence('weekly', '2026-02-26')).toBe('2026-03-05');
    expect(nextOccurrence('weekdays', '2026-10-02')).toBe('2026-10-05');
  });
});

describe('moodTrend', () => {
  it('keeps only logged moods in the window, oldest first', () => {
    const entries = [
      { date: '2026-10-02', title: '', tags: [], excerpt: '', mood: 'good' as const },
      { date: '2026-09-30', title: '', tags: [], excerpt: '' },
      { date: '2026-09-01', title: '', tags: [], excerpt: '', mood: 'low' as const },
      { date: '2026-09-29', title: '', tags: [], excerpt: '', mood: 'sad' as const },
    ];
    expect(moodTrend(entries, '2026-10-02', 30)).toEqual([
      { date: '2026-09-29', mood: 'sad', value: 2 },
      { date: '2026-10-02', mood: 'good', value: 5 },
    ]);
  });
});
