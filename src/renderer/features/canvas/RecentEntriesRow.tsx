import type { EntrySummary } from '../../../shared/types/Entry';
import { MOOD_EMOJI } from '../../components/MoodSelector';
import { formatShortDate } from '../../domain/dates';

interface Props {
  entries: EntrySummary[];
  onOpenEntry: (date: string) => void;
  onWrite: () => void;
}

export function RecentEntriesRow({ entries, onOpenEntry, onWrite }: Props) {
  if (entries.length === 0) {
    return (
      <section className="card empty-card">
        <h3 className="card-title">Your journal starts here</h3>
        <p className="muted">Nothing written yet. That’s fine. Today is a good day to begin.</p>
        <button className="btn btn-primary" onClick={onWrite}>
          Write your first entry
        </button>
      </section>
    );
  }
  return (
    <div className="canvas-row">
      {entries.slice(0, 3).map((e) => (
        <button key={e.date} className="card entry-card" onClick={() => onOpenEntry(e.date)}>
          <div className="entry-card-head">
            <span className="micro muted">{formatShortDate(e.date)}</span>
            {e.mood && <span aria-label={`Mood: ${e.mood}`}>{MOOD_EMOJI[e.mood]}</span>}
          </div>
          <div className="entry-card-title">{e.title || 'Untitled'}</div>
          <p className="entry-card-excerpt">{e.excerpt || 'No words yet.'}</p>
          {e.tags.length > 0 && (
            <div className="tags">
              {e.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
