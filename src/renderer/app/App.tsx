import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { toEntryDate } from '../domain/dates';
import { AllEntriesPage } from '../features/all-entries/AllEntriesPage';
import { AudioLogsPage } from '../features/audio-logs/AudioLogsPage';
import { CalendarPage } from '../features/calendar/CalendarPage';
import { CanvasPage } from '../features/canvas/CanvasPage';
import { EditorPage } from '../features/editor/EditorPage';
import { ChaptersPage } from '../features/chapters/ChaptersPage';
import { HabitsPage } from '../features/habits/HabitsPage';
import { HorizonsPage } from '../features/horizons/HorizonsPage';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { HealingPromptsPage } from '../features/healing/HealingPromptsPage';
import { TodoPage } from '../features/todo/TodoPage';
import { BoardsPage } from '../features/boards/BoardsPage';
import { useEntries } from '../hooks/useEntries';
import { useVault } from '../hooks/useVault';
import { RecorderProvider } from './RecorderContext';
import { Sidebar } from './Sidebar';
import { Splash } from './Splash';
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
  | { name: 'horizons' }
  | { name: 'boards' }
  | { name: 'settings' };
export type Navigate = (view: View) => void;

export function App() {
  const [view, setView] = useState<View>({ name: 'canvas' });
  const { entries, error, refresh } = useEntries();
  const vault = useVault(useCallback(() => void refresh(), [refresh]));
  const today = toEntryDate(new Date());
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  // On narrow screens the sidebar is a drawer behind the menu button.
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setNavOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  // The splash stays for a beat even when the vault opens instantly, so the opening never flickers.
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    void window.paroh.settings.get().then((s) => setOnboarded(s.onboarded));
    const t = window.setTimeout(() => setSplashDone(true), SPLASH_MIN_MS);
    return () => window.clearTimeout(t);
  }, []);

  const navigate = useCallback<Navigate>(
    (next) => {
      setView(next);
      setNavOpen(false);
      if (next.name !== 'editor') void refresh();
    },
    [refresh],
  );
  const openEntry = useCallback((date: string) => setView({ name: 'editor', date }), []);
  const refreshList = useCallback(() => void refresh(), [refresh]);

  const ready = onboarded !== null && splashDone;
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>{!ready && <Splash key="splash" />}</AnimatePresence>
      {ready && !onboarded && (
        <OnboardingPage
          onDone={() => {
            setOnboarded(true);
            void refresh();
          }}
        />
      )}
      {ready && onboarded && (
        <RecorderProvider>
          <div className={`app ${navOpen ? 'nav-open' : ''}`}>
            {navOpen && <div className="nav-backdrop" aria-hidden="true" onClick={() => setNavOpen(false)} />}
            <Sidebar view={view} today={today} vaultPath={vault.path} onNavigate={navigate} onChooseVault={vault.choose} />
            <div className="app-body">
              <TopBar
                query={view.name === 'entries' ? view.query : ''}
                navOpen={navOpen}
                onMenu={() => setNavOpen((o) => !o)}
                onSearch={(query) => setView({ name: 'entries', query })}
                onNewEntry={() => {
                  setNavOpen(false);
                  openEntry(today);
                }}
              />
              <main className="app-main">
                {/* Each screen rises into place, so a change of room is felt, not just seen. */}
                <motion.div
                  key={view.name === 'editor' ? `editor:${view.date}` : view.name}
                  className="view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                >
                  {view.name === 'canvas' && <CanvasPage today={today} entries={entries} loadError={error} onOpenEntry={openEntry} onEntriesChanged={refreshList} onNavigate={navigate} />}
                  {view.name === 'prompts' && <HealingPromptsPage today={today} entryDates={entries.map((e) => e.date)} onOpenEntry={openEntry} onChanged={refreshList} />}
                  {view.name === 'chapters' && <ChaptersPage today={today} onOpenEntry={openEntry} onOpenRange={(from, to) => navigate({ name: 'entries', query: '', from, to })} />}
                  {view.name === 'horizons' && <HorizonsPage today={today} entries={entries} onOpenEntry={openEntry} />}
                  {view.name === 'settings' && <SettingsPage onVaultChanged={refreshList} />}
                  {view.name === 'habits' && <HabitsPage today={today} />}
                  {view.name === 'todo' && <TodoPage today={today} />}
                  {view.name === 'boards' && <BoardsPage today={today} />}
                  {view.name === 'audio' && <AudioLogsPage onOpenEntry={openEntry} />}
                  {view.name === 'calendar' && <CalendarPage today={today} entries={entries} onOpenEntry={openEntry} />}
                  {view.name === 'entries' && <AllEntriesPage key={`${view.from ?? ''}:${view.to ?? ''}`} query={view.query} initialFrom={view.from} initialTo={view.to} onQuery={(query) => setView({ ...view, query })} onOpenEntry={openEntry} />}
                  {view.name === 'editor' && (
                    <EditorPage key={view.date} date={view.date} entries={entries} onOpenEntry={openEntry} onBack={() => navigate({ name: 'canvas' })} onSaved={refreshList} />
                  )}
                </motion.div>
              </main>
            </div>
          </div>
        </RecorderProvider>
      )}
    </MotionConfig>
  );
}

const SPLASH_MIN_MS = 1400;
