import { describe, expect, it } from 'vitest';
import { greeting, journalStreak } from '../../../src/renderer/domain/journalStreak';

describe('journalStreak', () => {
  it('counts consecutive days with an entry back from today', () => {
    expect(journalStreak(['2026-10-03', '2026-10-02', '2026-10-01', '2026-09-29'], '2026-10-03')).toBe(3);
  });
  it('does not break just because today has no entry yet', () => {
    expect(journalStreak(['2026-10-02', '2026-10-01'], '2026-10-03')).toBe(2);
  });
  it('is zero after a gap', () => {
    expect(journalStreak(['2026-09-30'], '2026-10-03')).toBe(0);
  });
});

describe('greeting', () => {
  it('follows the hour', () => {
    expect(greeting(8)).toBe('Good morning');
    expect(greeting(14)).toBe('Good afternoon');
    expect(greeting(19)).toBe('Good evening');
    expect(greeting(23)).toBe('Good night');
  });
});
