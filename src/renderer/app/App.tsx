import { useCallback, useState } from 'react';
import { toEntryDate } from '../domain/dates';
import { CanvasPage } from '../features/canvas/CanvasPage';
import { EditorPage } from '../features/editor/EditorPage';
import { useEntries } from '../hooks/useEntries';
import { useVault } from '../hooks/useVault';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export type View = { name: 'canvas' } | { name: 'editor'; date: string };

export function App() {
  const [view, setView] = useState<View>({ name: 'canvas' });
  const { entries, error, refresh } = useEntries();
  const vault = useVault(useCallback(() => void refresh(), [refresh]));
  const today = toEntryDate(new Date());

  const openEntry = useCallback((date: string) => setView({ name: 'editor', date }), []);
  const backToCanvas = useCallback(() => {
    setView({ name: 'canvas' });
    void refresh();
  }, [refresh]);

  return (
    <div className="app">
      <TopBar today={today} onNewEntry={() => openEntry(today)} />
      <div className="app-body">
        <Sidebar view={view} today={today} vaultPath={vault.path} onCanvas={backToCanvas} onToday={() => openEntry(today)} onChooseVault={vault.choose} />
        <main className="app-main">
          {view.name === 'canvas' ? (
            <CanvasPage today={today} entries={entries} loadError={error} onOpenEntry={openEntry} onEntriesChanged={refresh} />
          ) : (
            <EditorPage key={view.date} date={view.date} onBack={backToCanvas} onSaved={refresh} />
          )}
        </main>
      </div>
    </div>
  );
}
