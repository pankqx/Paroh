import type { EntrySummary } from '../../../shared/types/Entry';
import { HeroOpenerCard } from './HeroOpenerCard';
import { MiniCalendarCard } from './MiniCalendarCard';
import { MoodCheckInCard } from './MoodCheckInCard';
import { RecentEntriesRow } from './RecentEntriesRow';

interface Props {
  today: string;
  entries: EntrySummary[];
  loadError: string | null;
  onOpenEntry: (date: string) => void;
  onEntriesChanged: () => void;
}

export function CanvasPage({ today, entries, loadError, onOpenEntry, onEntriesChanged }: Props) {
  const todayEntry = entries.find((e) => e.date === today);
  return (
    <div className="canvas">
      {loadError && <div className="banner-error">Some entries could not be read: {loadError}</div>}
      <div className="canvas-grid">
        <HeroOpenerCard today={today} onWrite={() => onOpenEntry(today)} />
        <MoodCheckInCard today={today} mood={todayEntry?.mood} onSaved={onEntriesChanged} />
        <MiniCalendarCard today={today} entries={entries} onOpenEntry={onOpenEntry} />
      </div>
      <RecentEntriesRow entries={entries} onOpenEntry={onOpenEntry} onWrite={() => onOpenEntry(today)} />
      <div className="canvas-row">
        {['Today’s Habits', 'Today’s Tasks', 'Audio Logs'].map((title) => (
          <section key={title} className="card card-placeholder" aria-label={title}>
            <h3 className="card-title">{title}</h3>
            <p className="muted">Coming in a later phase.</p>
          </section>
        ))}
      </div>
    </div>
  );
}
