import { ArrowRight, BookOpen, CalendarCheck, Flame } from 'lucide-react';
import type { EntrySummary } from '../../../shared/types/Entry';
import type { Navigate } from '../../app/App';
import { fromEntryDate } from '../../domain/dates';
import { greeting, journalStreak } from '../../domain/journalStreak';
import { AudioLogsCard } from './AudioLogsCard';
import { HealingPromptCard } from '../healing/HealingPromptCard';
import { HabitsCard } from './HabitsCard';
import { HeroOpenerCard } from './HeroOpenerCard';
import { MiniCalendarCard } from './MiniCalendarCard';
import { MoodCheckInCard } from './MoodCheckInCard';
import { RecentEntriesRow } from './RecentEntriesRow';
import { TasksCard } from './TasksCard';

interface Props {
  today: string;
  entries: EntrySummary[];
  loadError: string | null;
  onOpenEntry: (date: string) => void;
  onEntriesChanged: () => void;
  onNavigate: Navigate;
}

export function CanvasPage({ today, entries, loadError, onOpenEntry, onEntriesChanged, onNavigate }: Props) {
  const todayEntry = entries.find((e) => e.date === today);
  const d = fromEntryDate(today);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
  const dayMonth = d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
  const streak = journalStreak(
    entries.map((e) => e.date),
    today,
  );
  const thisMonth = entries.filter((e) => e.date.slice(0, 7) === today.slice(0, 7)).length;

  return (
    <div className="canvas stagger">
      <header className="home-head">
        <div>
          <div className="page-kicker">{greeting(new Date().getHours())}</div>
          <h1 className="home-title">
            {weekday}, <span className="italic-accent">{dayMonth}</span>
          </h1>
        </div>
        <dl className="home-stats">
          <div className="home-stat">
            <Flame size={16} strokeWidth={1.8} aria-hidden="true" />
            <dt>Day streak</dt>
            <dd>{streak}</dd>
          </div>
          <div className="home-stat">
            <CalendarCheck size={16} strokeWidth={1.8} aria-hidden="true" />
            <dt>This month</dt>
            <dd>{thisMonth}</dd>
          </div>
          <div className="home-stat">
            <BookOpen size={16} strokeWidth={1.8} aria-hidden="true" />
            <dt>Pages</dt>
            <dd>{entries.length}</dd>
          </div>
        </dl>
      </header>
      {loadError && <div className="banner-error">Some entries could not be read: {loadError}</div>}
      <div className="canvas-grid">
        <HeroOpenerCard today={today} hasEntry={Boolean(todayEntry)} onWrite={() => onOpenEntry(today)} />
        <div className="canvas-stack">
          <MoodCheckInCard today={today} mood={todayEntry?.mood} onSaved={onEntriesChanged} />
          <HealingPromptCard
            today={today}
            entryDates={entries.map((e) => e.date)}
            onOpenEntry={onOpenEntry}
            onChanged={onEntriesChanged}
            onOpenPage={() => onNavigate({ name: 'prompts' })}
          />
        </div>
        <MiniCalendarCard today={today} entries={entries} onOpenEntry={onOpenEntry} />
      </div>
      <section className="home-section" aria-labelledby="recent-title">
        <div className="home-section-head">
          <h2 className="home-section-title" id="recent-title">
            Recent pages
          </h2>
          {entries.length > 0 && (
            <button className="link-btn" onClick={() => onNavigate({ name: 'entries', query: '' })}>
              All entries <ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <RecentEntriesRow entries={entries} onOpenEntry={onOpenEntry} onWrite={() => onOpenEntry(today)} />
      </section>
      <div className="canvas-row">
        <HabitsCard today={today} onOpenPage={() => onNavigate({ name: 'habits' })} />
        <TasksCard today={today} onOpenPage={() => onNavigate({ name: 'todo' })} />
        <AudioLogsCard onOpenPage={() => onNavigate({ name: 'audio' })} />
      </div>
    </div>
  );
}
