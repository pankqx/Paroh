import { describe, expect, it } from 'vitest';
import { monthGrid, toEntryDate } from '../../../src/renderer/domain/dates';
import { pickDailyQuote } from '../../../src/renderer/domain/dailyOpener';
import { countWords, readMinutes } from '../../../src/renderer/domain/wordCount';

describe('monthGrid', () => {
  it('starts weeks on Monday, like the dashboard reference', () => {
    // June 2025 starts on a Sunday, so the first row is May 26 to June 1.
    const grid = monthGrid(2025, 5);
    expect(grid[0][0]).toEqual({ date: '2025-05-26', day: 26, inMonth: false });
    expect(grid[0][6]).toEqual({ date: '2025-06-01', day: 1, inMonth: true });
  });

  it('always has six rows so the calendar card never changes height', () => {
    expect(monthGrid(2026, 1)).toHaveLength(6);
    expect(monthGrid(2026, 9).every((w) => w.length === 7)).toBe(true);
  });
});

describe('toEntryDate', () => {
  it('uses the local calendar day', () => {
    expect(toEntryDate(new Date(2026, 9, 2, 23, 59))).toBe('2026-10-02');
  });
});

describe('pickDailyQuote', () => {
  const quotes = [1, 2, 3, 4, 5].map((n) => ({ id: `q${n}`, text: `t${n}`, attribution: 'a' }));
  it('shows the same quote all day', () => {
    expect(pickDailyQuote(quotes, '2026-10-02')).toBe(pickDailyQuote(quotes, '2026-10-02'));
  });
  it('copes with an empty bank', () => {
    expect(pickDailyQuote([], '2026-10-02')).toBeUndefined();
  });
});

describe('word count', () => {
  it('ignores Markdown punctuation and code blocks', () => {
    expect(countWords('## Hello **world**\n\n- one\n```\nignored code\n```')).toBe(3);
  });
  it('rounds read time up to a whole minute', () => {
    expect(readMinutes(0)).toBe(0);
    expect(readMinutes(1)).toBe(1);
    expect(readMinutes(401)).toBe(3);
  });
});
