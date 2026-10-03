import { useEffect, useState } from 'react';
import type { Entry } from '../../../shared/types/Entry';
import { markdownToPlainText } from '../../../shared/plainText';
import { MOOD_EMOJI } from '../../components/MoodSelector';
import { chapterSummary, describeWeek, formatMonth, hardestWeek, shiftMonth } from '../../domain/chapters';
import { formatShortDate } from '../../domain/dates';
import { useAiFeature } from '../../hooks/useAiStatus';
import { EditorsNoteCard } from './EditorsNoteCard';
import { MoodLandscape } from './MoodLandscape';

interface Props {
  today: string;
  onOpenEntry: (date: string) => void;
  onOpenRange: (from: string, to: string) => void;
}

/** A month of entries reflected back, computed entirely from what was already written (feature-specifications.md §11). */
export function ChaptersPage({ today, onOpenEntry, onOpenRange }: Props) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [loaded, setLoaded] = useState<{ month: string; entries: Entry[]; error: string | null } | null>(null);
  const [version, setVersion] = useState(0);
  const noteEnabled = useAiFeature('editors-note') === true;

  useEffect(() => window.paroh.vault.onChanged(() => setVersion((v) => v + 1)), []);

  useEffect(() => {
    let cancelled = false;
    void window.paroh.chapters.month(month).then((r) => {
      if (!cancelled) setLoaded(r.ok ? { month, entries: r.value, error: null } : { month, entries: [], error: r.error });
    });
    return () => {
      cancelled = true;
    };
  }, [month, version]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'ArrowLeft') setMonth((m) => shiftMonth(m, -1));
      if (e.key === 'ArrowRight') setMonth((m) => shiftMonth(m, 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const entries = loaded?.month === month ? loaded.entries : [];
  const chapter = chapterSummary(month, entries);
  const hardest = hardestWeek(chapter.weeks);

  return (
    <div className="page chapters">
      <div className="page-head">
        <div>
          <div className="eyebrow">Chapter</div>
          <h1 className="page-title chapter-title">{formatMonth(month)}</h1>
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" title="←">
            ‹ {formatMonth(shiftMonth(month, -1))}
          </button>
          <button className="btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month" title="→">
            {formatMonth(shiftMonth(month, 1))} ›
          </button>
        </div>
      </div>

      {loaded?.error && (
        <div className="banner-error" role="alert">
          {loaded.error}
        </div>
      )}

      {loaded?.month === month && entries.length === 0 ? (
        <p className="muted chapter-empty">No entries this month.</p>
      ) : (
        <>
          <MoodLandscape chapter={chapter} />

          <dl className="stat-grid">
            <div className="stat">
              <dt>Entries written</dt>
              <dd>{chapter.entryCount}</dd>
            </div>
            <div className="stat">
              <dt>Days logged</dt>
              <dd>{chapter.daysLogged}</dd>
            </div>
            <div className="stat">
              <dt>Longest streak</dt>
              <dd>
                {chapter.longestStreak} {chapter.longestStreak === 1 ? 'day' : 'days'}
              </dd>
            </div>
            <div className="stat">
              <dt>Most-used word</dt>
              <dd className="stat-word">{chapter.topWord ?? '—'}</dd>
              {chapter.topWords.length > 1 && <dd className="micro muted">also {chapter.topWords.slice(1).map((w) => w.word).join(', ')}</dd>}
            </div>
          </dl>

          <EditorsNoteCard month={month} enabled={noteEnabled} />

          <section aria-labelledby="weeks-title">
            <h2 className="section-title" id="weeks-title">
              Week by week
            </h2>
            <ul className="week-list">
              {chapter.weeks.map((w) => (
                <li key={w.from}>
                  <button className="week-row" onClick={() => onOpenRange(w.from, w.to)}>
                    <span className="week-name">Week {w.index}</span>
                    <span className="micro muted">
                      {formatShortDate(w.from)}–{formatShortDate(w.to)}
                    </span>
                    <span className="week-mood">
                      {w.moods.map((m, i) => (
                        <span key={i} aria-hidden="true">
                          {MOOD_EMOJI[m]}
                        </span>
                      ))}{' '}
                      <span className="small">{describeWeek(w.moods)}</span>
                      {hardest?.from === w.from && <span className="micro muted"> · the hardest week</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="chapter-entries-title">
            <h2 className="section-title" id="chapter-entries-title">
              This month’s entries
            </h2>
            <ul className="chapter-entries">
              {[...entries].reverse().map((e) => (
                <li key={e.date}>
                  <button className="chapter-entry" onClick={() => onOpenEntry(e.date)}>
                    <span className="micro muted">{formatShortDate(e.date)}</span>
                    <span className="chapter-entry-title">{e.title || 'Untitled'}</span>
                    {e.mood && <span aria-label={`Mood: ${e.mood}`}>{MOOD_EMOJI[e.mood]}</span>}
                    <span className="chapter-entry-excerpt small muted">{markdownToPlainText(e.body).slice(0, 140)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
