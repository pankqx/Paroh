import { ChevronDown, Flag, NotebookPen, Plus } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Priority, Recurrence, Task } from '../../../shared/types/Task';
import { addDays, formatLongDate } from '../../domain/dates';
import { groupTasks, todayProgress } from '../../domain/tasks';
import { useTasks } from '../../hooks/useTasks';
import { NudgeMenu } from './NudgeMenu';
import { PRIORITY_LABEL, TaskCard } from './TaskCard';
import { TaskDetail } from './TaskDetail';

type When = 'today' | 'tomorrow' | 'date' | 'someday';
const WHEN: { id: When; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'date', label: 'Pick a date' },
  { id: 'someday', label: 'Someday' },
];

export function TodoPage({ today }: { today: string }) {
  const { tasks, create, update, toggle, resolveNudge, remove, comment, uncomment, error, dismissError } = useTasks();
  const [text, setText] = useState('');
  const [notes, setNotes] = useState('');
  const [details, setDetails] = useState(false);
  const [when, setWhen] = useState<When>('today');
  const [date, setDate] = useState(addDays(today, 2));
  const [repeat, setRepeat] = useState<Recurrence | ''>('');
  const [priority, setPriority] = useState<Priority | undefined>();
  const [openId, setOpenId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const g = groupTasks(tasks, today);
  const progress = todayProgress(tasks, today);
  const open = tasks.find((t) => t.id === openId);

  // N focuses the new-task box (feature-specifications.md §7), unless you're already typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea, select, [contenteditable]');
      if (!typing && e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function add() {
    if (!text.trim()) return;
    const dueDate = when === 'today' ? today : when === 'tomorrow' ? addDays(today, 1) : when === 'date' ? date : undefined;
    if (await create({ text, dueDate, recurring: dueDate && repeat ? repeat : undefined, notes, priority })) {
      setText('');
      setNotes('');
      setPriority(undefined);
      setDetails(false);
    }
  }

  const confirmRemove = (t: Task) => {
    if (!window.confirm(`Delete “${t.text}”?`)) return;
    if (openId === t.id) setOpenId(null);
    void remove(t.id);
  };

  const card = (t: Task, extra?: ReactNode) => (
    <TaskCard key={t.id} task={t} today={today} selected={openId === t.id} onToggle={() => void toggle(t.id)} onOpen={() => setOpenId(openId === t.id ? null : t.id)} onRemove={() => confirmRemove(t)}>
      {extra}
    </TaskCard>
  );

  const section = (title: string, list: Task[], empty: string, extra?: ReactNode) => (
    <section className="task-section" aria-label={title}>
      <h2 className="task-section-title">
        {title} <span className="task-count">{list.length || ''}</span>
      </h2>
      {extra}
      {list.length === 0 ? <p className="task-empty">{empty}</p> : <ul className="task-list">{list.map((t) => card(t))}</ul>}
    </section>
  );

  const pct = progress.total ? progress.done / progress.total : 0;

  return (
    <div className={`page todo-page ${open ? 'with-detail' : ''}`}>
      <div className="todo-main">
        <header className="todo-hero">
          <div>
            <div className="eyebrow">{formatLongDate(today)}</div>
            <h1 className="page-title">To-Do</h1>
            <p className="todo-sub">
              {progress.total === 0 ? 'A clear day. Add what matters, nothing more.' : progress.done === progress.total ? 'Everything for today is done. Well held.' : `${progress.total - progress.done} left for today.`}
            </p>
          </div>
          <div className="todo-ring" role="img" aria-label={`${progress.done} of ${progress.total} done today`}>
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="27" className="ring-track" />
              <circle cx="32" cy="32" r="27" className="ring-fill" pathLength={1} strokeDasharray={`${pct} 1`} />
            </svg>
            <span className="todo-ring-text">
              {progress.done}
              <small>/{progress.total}</small>
            </span>
          </div>
        </header>

        <form
          className="task-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <div className="composer-row">
            <Plus size={18} className="composer-plus" aria-hidden="true" />
            <input ref={input} className="composer-input" placeholder="What needs doing?" aria-label="New task" value={text} onChange={(e) => setText(e.target.value)} />
            <span className="composer-hint micro muted" aria-hidden="true">
              N
            </span>
          </div>
          {details && (
            <textarea className="composer-notes" placeholder="A small explanation (optional)" aria-label="Explanation" value={notes} onChange={(e) => setNotes(e.target.value)} />
          )}
          <div className="composer-options">
            <div className="segmented" role="group" aria-label="When">
              {WHEN.map((w) => (
                <button key={w.id} type="button" className={`seg-btn ${when === w.id ? 'on' : ''}`} aria-pressed={when === w.id} onClick={() => setWhen(w.id)}>
                  {w.label}
                </button>
              ))}
            </div>
            {when === 'date' && <input className="filter-input" type="date" aria-label="Deadline" min={today} value={date} onChange={(e) => setDate(e.target.value)} />}
            {when !== 'someday' && (
              <select aria-label="Repeat" value={repeat} onChange={(e) => setRepeat(e.target.value as Recurrence | '')}>
                <option value="">Doesn’t repeat</option>
                <option value="daily">Every day</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekly">Every week</option>
              </select>
            )}
            <div className="prio-pick" role="group" aria-label="Priority">
              {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                <button key={p} type="button" className={`prio-dot prio-${p} ${priority === p ? 'on' : ''}`} aria-pressed={priority === p} aria-label={`${PRIORITY_LABEL[p]} priority`} title={`${PRIORITY_LABEL[p]} priority`} onClick={() => setPriority(priority === p ? undefined : p)}>
                  <Flag size={13} aria-hidden="true" />
                </button>
              ))}
            </div>
            <button type="button" className={`chip-btn ${details ? 'on' : ''}`} aria-pressed={details} onClick={() => setDetails((d) => !d)}>
              <NotebookPen size={14} aria-hidden="true" />
              Explanation
            </button>
            <button className="btn btn-primary composer-add" type="submit" disabled={!text.trim()}>
              Add task
            </button>
          </div>
        </form>

        {error && (
          <div className="banner-error" role="alert">
            {error}{' '}
            <button className="link-btn" onClick={dismissError}>
              Dismiss
            </button>
          </div>
        )}

        <section className="task-section" aria-label="Today">
          <h2 className="task-section-title">
            Today <span className="task-count">{g.nudges.length + g.today.length || ''}</span>
          </h2>
          {g.nudges.length + g.today.length === 0 ? (
            <p className="task-empty">Nothing on your list. Add one, or just write.</p>
          ) : (
            <ul className="task-list">
              {g.nudges.map((t) => card(t, <NudgeMenu task={t} onResolve={(a, why) => void resolveNudge(t.id, a, why)} />))}
              {g.today.map((t) => card(t))}
            </ul>
          )}
        </section>
        {section('Upcoming', g.upcoming, 'Nothing scheduled ahead.')}
        {section('Someday', g.someday, 'Ideas with no date go here.')}
        {g.done.length > 0 && (
          <section className="task-section" aria-label="Done">
            <button className="task-section-title task-done-toggle" aria-expanded={showDone} onClick={() => setShowDone((s) => !s)}>
              Done <span className="task-count">{g.done.length}</span>
              <ChevronDown size={16} className={showDone ? 'flip' : ''} aria-hidden="true" />
            </button>
            {showDone && <ul className="task-list">{g.done.slice(0, 30).map((t) => card(t))}</ul>}
          </section>
        )}
      </div>

      <AnimatePresence>
        {open && <div className="task-scrim" key="scrim" aria-hidden="true" onClick={() => setOpenId(null)} />}
        {open && (
          <TaskDetail
            key={open.id}
            task={open}
            today={today}
            onClose={() => setOpenId(null)}
            onUpdate={(input) => update(open.id, input)}
            onComment={(t) => comment(open.id, t)}
            onUncomment={(c) => void uncomment(open.id, c)}
            onRemove={() => confirmRemove(open)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
