import { useState } from 'react';
import type { Habit } from '../../../shared/types/Habit';
import { completedDates, computeStreak, isScheduled } from '../../domain/streak';
import { useHabits } from '../../hooks/useHabits';
import { HabitForm } from './HabitForm';
import { HabitHeatmap } from './HabitHeatmap';

const FREQ_LABEL = (h: Habit) => (h.frequency === 'daily' ? 'Every day' : h.frequency === 'weekdays' ? 'Weekdays' : (h.customDays ?? []).map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', '));

export function HabitsPage({ today }: { today: string }) {
  const { habits, history, todayDone, toggle, create, update, setArchived, error, dismissError } = useHabits(today);
  const [editing, setEditing] = useState<string | null>(null);
  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);

  const row = (h: Habit) => {
    const done = completedDates(h.id, history);
    const streak = computeStreak(h, done, today);
    return (
      <li key={h.id} className={`card habit-row ${h.archived ? 'archived' : ''}`}>
        {editing === h.id ? (
          <HabitForm initial={h} submitLabel="Save" onSubmit={async (input) => (await update(h.id, input)) && (setEditing(null), true)} onCancel={() => setEditing(null)} />
        ) : (
          <div className="habit-head">
            <label className="check-label">
              <input type="checkbox" checked={todayDone.has(h.id)} disabled={h.archived} onChange={() => void toggle(h.id)} aria-label={`${h.name}, done today`} />
              <span className="habit-name">{h.name}</span>
            </label>
            <span className="micro muted">{FREQ_LABEL(h)}</span>
            <span className="micro">{streak > 0 ? `🔥 ${streak}-day streak` : ''}</span>
            <span className="habit-actions">
              {!h.archived && (
                <button className="link-btn" onClick={() => setEditing(h.id)}>
                  Edit
                </button>
              )}
              <button className="link-btn" onClick={() => void setArchived(h.id, !h.archived)}>
                {h.archived ? 'Restore' : 'Archive'}
              </button>
            </span>
          </div>
        )}
        <HabitHeatmap name={h.name} done={done} scheduled={(d) => isScheduled(h, d) && d >= h.createdAt} today={today} />
      </li>
    );
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Habits</h1>
        <span className="muted micro">Only today can be ticked. Past days are kept as an honest record.</span>
      </div>
      <HabitForm submitLabel="Add habit" onSubmit={create} />
      {error && (
        <div className="banner-error" role="alert">
          {error}{' '}
          <button className="link-btn" onClick={dismissError}>
            Dismiss
          </button>
        </div>
      )}
      {active.length === 0 && <p className="muted">No habits yet. Add one above, or pick from the suggestions on the Canvas.</p>}
      <ul className="habit-list">{active.map(row)}</ul>
      {archived.length > 0 && (
        <>
          <h2 className="section-title">Archived</h2>
          <ul className="habit-list">{archived.map(row)}</ul>
        </>
      )}
    </div>
  );
}
