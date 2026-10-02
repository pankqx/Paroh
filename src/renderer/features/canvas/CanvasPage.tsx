import type { EntrySummary } from '../../../shared/types/Entry';
import type { Navigate } from '../../app/App';
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
  return (
    <div className="canvas">
      {loadError && <div className="banner-error">Some entries could not be read: {loadError}</div>}
      <div className="canvas-grid">
        <HeroOpenerCard today={today} onWrite={() => onOpenEntry(today)} />
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
      <RecentEntriesRow entries={entries} onOpenEntry={onOpenEntry} onWrite={() => onOpenEntry(today)} />
      <div className="canvas-row">
        <HabitsCard today={today} onOpenPage={() => onNavigate({ name: 'habits' })} />
        <TasksCard today={today} onOpenPage={() => onNavigate({ name: 'todo' })} />
        <AudioLogsCard onOpenPage={() => onNavigate({ name: 'audio' })} />
      </div>
    </div>
  );
}
