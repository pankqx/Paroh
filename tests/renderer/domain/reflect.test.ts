import { describe, expect, it } from 'vitest';
import { chapterSummary, describeLandscape, describeWeek, hardestWeek, monthWeeks, shiftMonth } from '../../../src/renderer/domain/chapters';
import { assignLanes, periodRange, storySpan, timelineColumns, timelineFraction, timelineYears } from '../../../src/renderer/domain/horizons';
import { topWords } from '../../../src/renderer/domain/wordFrequency';
import { emptyEntry, type Entry } from '../../../src/shared/types/Entry';
import type { LifeStory } from '../../../src/shared/types/LifeStory';
import type { Mood } from '../../../src/shared/types/Mood';

const entry = (date: string, patch: Partial<Entry> = {}): Entry => ({ ...emptyEntry(date), ...patch });

describe('topWords', () => {
  it('counts words without stopwords, case-insensitively, ignoring blockquotes', () => {
    const bodies = ['> What thought was underneath it? thought thought\n\nCoffee with **Sam**. Coffee again.', "Sam called. I'm glad Sam called."];
    expect(topWords(bodies, 3)).toEqual([
      { word: 'sam', count: 3 },
      { word: 'called', count: 2 },
      { word: 'coffee', count: 2 },
    ]);
  });
  it('is empty for empty bodies', () => {
    expect(topWords(['', '   '])).toEqual([]);
  });
});

describe('chapterSummary', () => {
  const entries = [
    entry('2026-10-01', { mood: 'low', body: 'Rain all day.' }),
    entry('2026-10-02', { mood: 'sad', body: 'More rain.' }),
    entry('2026-10-03', { mood: 'meh' }),
    entry('2026-10-15', { mood: 'good', body: 'Sunshine and rain clouds gone.' }),
    entry('2026-09-30', { mood: 'good', body: 'September' }),
  ];
  const c = chapterSummary('2026-10', entries);

  it('counts written entries, logged days and the longest run within the month', () => {
    expect(c.entryCount).toBe(3);
    expect(c.daysLogged).toBe(4);
    expect(c.longestStreak).toBe(3);
    expect(c.topWord).toBe('rain');
  });

  it('groups moods into Monday-first weeks clipped to the month', () => {
    expect(c.weeks[0]).toMatchObject({ index: 1, from: '2026-10-01', to: '2026-10-04', moods: ['low', 'sad', 'meh'] });
    expect(c.weeks.at(-1)).toMatchObject({ from: '2026-10-26', to: '2026-10-31' });
    expect(c.moodByWeek[2]).toEqual(['good']);
  });

  it('describes the landscape in words and finds the hardest week', () => {
    expect(describeWeek(['low', 'sad', 'meh'])).toBe('mixed, from low to meh');
    expect(describeWeek(['ok', 'good'] as Mood[])).toBe('mostly good');
    expect(describeWeek([])).toBe('no mood logged');
    expect(describeLandscape(c.weeks)).toContain('Trending up by week 3.');
    expect(hardestWeek(c.weeks)?.index).toBe(1);
  });

  it('still renders a sparse or empty month', () => {
    const empty = chapterSummary('2026-11', []);
    expect(empty).toMatchObject({ entryCount: 0, daysLogged: 0, longestStreak: 0, topWord: null });
    expect(describeLandscape(empty.weeks)).toBe('No moods logged this month.');
    expect(hardestWeek(empty.weeks)).toBeNull();
  });

  it('moves between months across years', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(monthWeeks('2026-02').reduce((n, w) => n + 1 + (Date.parse(w.to) - Date.parse(w.from)) / 86400000, 0)).toBe(28);
  });
});

describe('Horizons timeline', () => {
  const story = (patch: Partial<LifeStory>): LifeStory => ({ id: 'health/x', schema_version: 1, title: 'x', life_area: 'health', status: 'dreaming', created: '2026-06-01', linked_entries: [], why: '', ...patch });

  it('stretches an ongoing story to today and a pictured one to the end of its period', () => {
    expect(storySpan(story({}), '2026-10-02')).toEqual({ from: '2026-06-01', to: '2026-10-02' });
    expect(storySpan(story({ when: '2027-Q2' }), '2026-10-02')).toEqual({ from: '2026-06-01', to: '2027-06-30' });
    expect(storySpan(story({ when: '2025' }), '2026-10-02')).toEqual({ from: '2025-01-01', to: '2026-06-01' });
  });

  it('builds year and quarter columns that cover every story', () => {
    expect(periodRange('2026-Q4')).toEqual({ from: '2026-10-01', to: '2026-12-31' });
    const years = timelineYears([story({ created: '2022-03-01', when: '2032' })], '2026-10-02');
    expect(years).toEqual({ from: 2022, to: 2032 });
    expect(timelineColumns({ from: 2026, to: 2027 }, 'year').map((c) => c.key)).toEqual(['2026', '2027']);
    expect(timelineColumns({ from: 2026, to: 2026 }, 'quarter').map((c) => c.label)).toEqual(['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026']);
    expect(timelineFraction('2027-01-01', { from: 2026, to: 2027 })).toBeCloseTo(0.5, 2);
  });

  it('puts overlapping bands on separate lanes', () => {
    expect(assignLanes([{ left: 0, right: 100 }, { left: 50, right: 150 }, { left: 120, right: 200 }, { left: 160, right: 300 }])).toEqual([0, 1, 0, 1]);
  });
});
