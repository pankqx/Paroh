import { useCallback, useState } from 'react';
import { toEntryDate } from '../domain/dates';
import { AllEntriesPage } from '../features/all-entries/AllEntriesPage';
import { AudioLogsPage } from '../features/audio-logs/AudioLogsPage';
import { CalendarPage } from '../features/calendar/CalendarPage';
import { CanvasPage } from '../features/canvas/CanvasPage';
import { EditorPage } from '../features/editor/EditorPage';
import { ChaptersPage } from '../features/chapters/ChaptersPage';
import { HabitsPage } from '../features/habits/HabitsPage';
import { HorizonsPage } from '../features/horizons/HorizonsPage';
import { HealingPromptsPage } from '../features/healing/HealingPromptsPage';
import { TodoPage } from '../features/todo/TodoPage';
import { useEntries } from '../hooks/useEntries';
import { useVault } from '../hooks/useVault';
import { RecorderProvider } from './RecorderContext';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export type View =
  | { name: 'canvas' }
  | { name: 'calendar' }
  | { name: 'entries'; query: string; from?: string; to?: string }
  | { name: 'editor'; date: string }
  | { name: 'habits' }
  | { name: 'todo' }
  | { name: 'audio' }
  | { name: 'prompts' }
  | { name: 'chapters' }
  | { name: 'horizons' };
export type Navigate = (view: View) => void;

export function App() {
  const [view, setView] = useState<View>({ name: 'canvas' });
  const { entries, error, refresh } = useEntries();
  const vault = useVault(useCallback(() => void refresh(), [refresh]));
  const today = toEntryDate(new Date());

  const navigate = useCallback<Navigate>(
    (next) => {
      setView(next);
      if (next.name !== 'editor') void refresh();
    },
    [refresh],
  );
  const openEntry = useCallback((date: string) => setView({ name: 'editor', date }), []);
  const refreshList = useCallback(() => void refresh(), [refresh]);

  return (
    <RecorderProvider>
    <div className="app">
      <TopBar today={today} query={view.name === 'entries' ? view.query : ''} onSearch={(query) => setView({ name: 'entries', query })} onNewEntry={() => openEntry(today)} />
      <div className="app-body">
        <Sidebar view={view} today={today} vaultPath={vault.path} onNavigate={navigate} onChooseVault={vault.choose} />
        <main className="app-main">
          {view.name === 'canvas' && <CanvasPage today={today} entries={entries} loadError={error} onOpenEntry={openEntry} onEntriesChanged={refreshList} onNavigate={navigate} />}
          {view.name === 'prompts' && <HealingPromptsPage today={today} entryDates={entries.map((e) => e.date)} onOpenEntry={openEntry} onChanged={refreshList} />}
          {view.name === 'chapters' && <ChaptersPage today={today} onOpenEntry={openEntry} onOpenRange={(from, to) => navigate({ name: 'entries', query: '', from, to })} />}
          {view.name === 'horizons' && <HorizonsPage today={today} entries={entries} onOpenEntry={openEntry} />}
          {view.name === 'habits' && <HabitsPage today={today} />}
          {view.name === 'todo' && <TodoPage today={today} />}
          {view.name === 'audio' && <AudioLogsPage onOpenEntry={openEntry} />}
          {view.name === 'calendar' && <CalendarPage today={today} entries={entries} onOpenEntry={openEntry} />}
          {view.name === 'entries' && <AllEntriesPage key={`${view.from ?? ''}:${view.to ?? ''}`} query={view.query} initialFrom={view.from} initialTo={view.to} onQuery={(query) => setView({ ...view, query })} onOpenEntry={openEntry} />}
          {view.name === 'editor' && (
            <EditorPage key={view.date} date={view.date} entries={entries} onOpenEntry={openEntry} onBack={() => navigate({ name: 'canvas' })} onSaved={refreshList} />
          )}
        </main>
      </div>
    </div>
    </RecorderProvider>
  );
}
