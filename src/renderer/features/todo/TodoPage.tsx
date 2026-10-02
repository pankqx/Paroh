import { useEffect, useRef, useState } from 'react';
import type { Recurrence, Task } from '../../../shared/types/Task';
import { CheckRow } from '../../components/CheckRow';
import { addDays, formatShortDate } from '../../domain/dates';
import { groupTasks } from '../../domain/tasks';
import { useTasks } from '../../hooks/useTasks';
import { NudgeMenu } from './NudgeMenu';

type When = 'today' | 'tomorrow' | 'date' | 'someday';

export function TodoPage({ today }: { today: string }) {
  const { tasks, create, toggle, resolveNudge, remove, error, dismissError } = useTasks();
  const [text, setText] = useState('');
  const [when, setWhen] = useState<When>('today');
  const [date, setDate] = useState(addDays(today, 2));
  const [repeat, setRepeat] = useState<Recurrence | ''>('');
  const input = useRef<HTMLInputElement>(null);
  const g = groupTasks(tasks, today);

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
    if (await create({ text, dueDate, recurring: dueDate && repeat ? repeat : undefined })) setText('');
  }

  const item = (t: Task, extra?: React.ReactNode) => (
    <CheckRow key={t.id} checked={t.done} label={t.text} onToggle={() => void toggle(t.id)}>
      <span className="task-meta micro muted">
        {t.recurring && <span title={`Repeats ${t.recurring}`}>↻ {t.recurring} </span>}
        {t.dueDate && t.dueDate !== today && !t.done && formatShortDate(t.dueDate)}
        {t.done && t.doneDate && `done ${formatShortDate(t.doneDate)}`}
      </span>
      {extra}
      <button
        className="icon-btn task-remove"
        aria-label={`Delete task: ${t.text}`}
        onClick={() => window.confirm(`Delete “${t.text}”?`) && void remove(t.id)}
      >
        ×
      </button>
    </CheckRow>
  );

  const section = (title: string, list: Task[], empty?: string) => (
    <section className="task-section" aria-label={title}>
      <h2 className="section-title">
        {title} <span className="micro muted">{list.length || ''}</span>
      </h2>
      {list.length === 0 && empty ? <p className="muted small">{empty}</p> : <ul className="check-list">{list.map((t) => item(t))}</ul>}
    </section>
  );

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">To-Do</h1>
        <span className="muted micro">Press N to add a task</span>
      </div>
      <form
        className="task-form"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input ref={input} className="filter-input grow" placeholder="What needs doing?" aria-label="New task" value={text} onChange={(e) => setText(e.target.value)} />
        <select className="filter-input" aria-label="When" value={when} onChange={(e) => setWhen(e.target.value as When)}>
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="date">On a date</option>
          <option value="someday">Someday</option>
        </select>
        {when === 'date' && <input className="filter-input" type="date" aria-label="Due date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />}
        {when !== 'someday' && (
          <select className="filter-input" aria-label="Repeat" value={repeat} onChange={(e) => setRepeat(e.target.value as Recurrence | '')}>
            <option value="">Doesn’t repeat</option>
            <option value="daily">Every day</option>
            <option value="weekdays">Weekdays</option>
            <option value="weekly">Every week</option>
          </select>
        )}
        <button className="btn btn-primary" type="submit" disabled={!text.trim()}>
          Add
        </button>
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
        <h2 className="section-title">Today</h2>
        <ul className="check-list">
          {g.nudges.map((t) => item(t, <NudgeMenu task={t} onResolve={(a, why) => void resolveNudge(t.id, a, why)} />))}
          {g.today.map((t) => item(t))}
        </ul>
        {g.nudges.length + g.today.length === 0 && <p className="muted small">Nothing on your list. Add one, or just write.</p>}
      </section>
      {section('Upcoming', g.upcoming, 'Nothing scheduled ahead.')}
      {section('Someday', g.someday, 'Ideas with no date go here.')}
      {g.done.length > 0 && section('Done', g.done.slice(0, 30))}
    </div>
  );
}
