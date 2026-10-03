import { PenLine } from 'lucide-react';
import type { EntrySummary } from '../../../shared/types/Entry';
import { MOOD_EMOJI } from '../../components/MoodSelector';
import { gradientCss } from '../../domain/covers';
import { fromEntryDate } from '../../domain/dates';
import { useMediaUrl } from '../../hooks/useMediaUrl';

interface Props {
  entries: EntrySummary[];
  onOpenEntry: (date: string) => void;
  onWrite: () => void;
}

export function RecentEntriesRow({ entries, onOpenEntry, onWrite }: Props) {
  if (entries.length === 0) {
    return (
      <section className="card empty-card">
        <h2 className="card-title">Your journal starts here</h2>
        <p className="muted">Nothing written yet. That’s fine. Today is a good day to begin.</p>
        <button className="btn btn-primary" onClick={onWrite}>
          <PenLine size={16} aria-hidden="true" />
          Write your first entry
        </button>
      </section>
    );
  }
  return (
    <div className="canvas-row">
      {entries.slice(0, 3).map((e) => (
        <EntryCard key={e.date} entry={e} onOpen={() => onOpenEntry(e.date)} />
      ))}
    </div>
  );
}

export function EntryCard({ entry: e, onOpen }: { entry: EntrySummary; onOpen: () => void }) {
  const d = fromEntryDate(e.date);
  return (
    <button className={`card entry-card ${e.mood ? `tone-${e.mood}` : ''} ${e.cover ? 'has-cover' : ''}`} onClick={onOpen}>
      {e.cover && <CardCover cover={e.cover} />}
      <div className="entry-card-head">
        <span className="entry-card-date">
          <span className="entry-card-day">{d.getDate()}</span>
          <span className="entry-card-month">
            {d.toLocaleDateString(undefined, { month: 'short' })}
            <br />
            {d.toLocaleDateString(undefined, { weekday: 'short' })}
          </span>
        </span>
        {e.mood && (
          <span className="entry-card-mood" aria-label={`Mood: ${e.mood}`}>
            {MOOD_EMOJI[e.mood]}
          </span>
        )}
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
  );
}

/** The page's cover, cropped into the top of its card. */
function CardCover({ cover }: { cover: string }) {
  const gradient = gradientCss(cover);
  const { url } = useMediaUrl(gradient ? undefined : cover);
  return <div className="entry-card-cover" aria-hidden="true" style={gradient ? { background: gradient } : url ? { backgroundImage: `url(${url})` } : undefined} />;
}
