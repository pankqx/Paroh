import { Archive, ArchiveRestore, Check, Flame, Pencil, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { addDays, fromEntryDate } from '../../../shared/localDate';
import type { Habit, HabitColor, HabitDay } from '../../../shared/types/Habit';
import { formatLongDate } from '../../domain/dates';
import { bestStreak, completedDates, computeStreak, isScheduled, keptRate } from '../../domain/streak';
import { useHabits } from '../../hooks/useHabits';
import { habitColor } from './habitColor';
import { HabitForm } from './HabitForm';
import { HabitHeatmap } from './HabitHeatmap';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FREQ_LABEL = (h: Habit) => (h.frequency === 'daily' ? 'Every day' : h.frequency === 'weekdays' ? 'Weekdays' : (h.customDays ?? []).map((d) => DAY_NAMES[d]).join(' · '));

export function HabitsPage({ today }: { today: string }) {
  const { habits, history, todayDone, toggle, create, update, setArchived, error, dismissError } = useHabits(today);
  const [editing, setEditing] = useState<string | null>(null);
  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);
  const colorOf = (h: Habit) => habitColor(h, habits.indexOf(h));
  const dueToday = active.filter((h) => isScheduled(h, today) || todayDone.has(h.id));
  const doneToday = dueToday.filter((h) => todayDone.has(h.id)).length;

  const card = (h: Habit) => {
    const done = completedDates(h.id, history);
    const streak = computeStreak(h, done, today);
    const best = bestStreak(h, done, today);
    const rate = Math.round(keptRate(h, done, today) * 100);
    const color = colorOf(h);
    const checked = todayDone.has(h.id);
    const offToday = !isScheduled(h, today);
    if (editing === h.id)
      return (
        <li key={h.id} className={`habit-card habit-${color} editing`}>
          <HabitForm initial={h} submitLabel="Save" onSubmit={async (input) => (await update(h.id, input)) && (setEditing(null), true)} onCancel={() => setEditing(null)} />
        </li>
      );
    return (
      <li key={h.id} className={`habit-card habit-${color} ${checked ? 'checked' : ''} ${h.archived ? 'archived' : ''}`}>
        <div className="habit-card-head">
          <label className="habit-tick">
            <input type="checkbox" checked={checked} disabled={h.archived} onChange={() => void toggle(h.id)} aria-label={`${h.name}, done today`} />
            <span className="habit-tick-face" aria-hidden="true">
              <Check size={20} strokeWidth={3} />
            </span>
          </label>
          <div className="habit-card-title">
            <span className="habit-name">{h.name}</span>
            <span className="habit-freq">
              {FREQ_LABEL(h)}
              {offToday && !h.archived && ' · a rest day today'}
            </span>
          </div>
          <span className="habit-actions">
            {!h.archived && (
              <button className="icon-btn small" aria-label={`Edit ${h.name}`} title="Edit" onClick={() => setEditing(h.id)}>
                <Pencil size={14} aria-hidden="true" />
              </button>
            )}
            <button className="icon-btn small" aria-label={`${h.archived ? 'Restore' : 'Archive'} ${h.name}`} title={h.archived ? 'Restore' : 'Archive'} onClick={() => void setArchived(h.id, !h.archived)}>
              {h.archived ? <ArchiveRestore size={14} aria-hidden="true" /> : <Archive size={14} aria-hidden="true" />}
            </button>
          </span>
        </div>
        <div className="habit-stats">
          <div className="habit-stat">
            <span className="habit-stat-value">
              <Flame size={16} aria-hidden="true" className={streak > 0 ? 'lit' : ''} />
              {streak}
            </span>
            <span className="habit-stat-label">day streak</span>
          </div>
          <div className="habit-stat">
            <span className="habit-stat-value">
              <Trophy size={15} aria-hidden="true" />
              {best}
            </span>
            <span className="habit-stat-label">best run</span>
          </div>
          <div className="habit-stat">
            <span className="habit-stat-value">{rate}%</span>
            <span className="habit-stat-label">last 30 days</span>
          </div>
        </div>
        <HabitHeatmap name={h.name} done={done} scheduled={(d) => isScheduled(h, d) && d >= h.createdAt} today={today} weeks={26} />
      </li>
    );
  };

  return (
    <div className="page habits-page">
      <header className="habits-hero">
        <div className="habits-hero-text">
          <div className="eyebrow">{formatLongDate(today)}</div>
          <h1 className="page-title">Habits</h1>
          <p className="todo-sub">
            {dueToday.length === 0 ? 'Nothing to keep today. Rest is part of it.' : doneToday === dueToday.length ? 'Every ring closed today. Beautifully kept.' : `${doneToday} of ${dueToday.length} kept today.`}
          </p>
          <WeekStrip habits={active} history={history} today={today} />
        </div>
        <TodayRings habits={dueToday} done={todayDone} colorOf={colorOf} />
      </header>

      <HabitForm submitLabel="Add habit" onSubmit={create} defaultColor={habitColor({ id: '', name: '', frequency: 'daily', createdAt: today, archived: false }, habits.length)} />
      {error && (
        <div className="banner-error" role="alert">
          {error}{' '}
          <button className="link-btn" onClick={dismissError}>
            Dismiss
          </button>
        </div>
      )}
      {active.length === 0 && <p className="task-empty">No habits yet. Start with one small thing you'd like to do most days.</p>}
      <p className="habits-note micro muted">Only today can be ticked. Past days stay as an honest record.</p>
      <ul className="habit-grid">{active.map(card)}</ul>
      {archived.length > 0 && (
        <section className="task-section" aria-label="Archived">
          <h2 className="task-section-title">
            Archived <span className="task-count">{archived.length}</span>
          </h2>
          <ul className="habit-grid">{archived.map(card)}</ul>
        </section>
      )}
    </div>
  );
}

/** Concentric rings, one per habit due today, that close as each is kept. */
function TodayRings({ habits, done, colorOf }: { habits: Habit[]; done: Set<string>; colorOf: (h: Habit) => HabitColor }) {
  const shown = habits.slice(0, 5);
  const kept = habits.filter((h) => done.has(h.id)).length;
  return (
    <div className="today-rings" role="img" aria-label={`${kept} of ${habits.length} habits kept today`}>
      <svg viewBox="0 0 160 160" aria-hidden="true">
        {shown.map((h, i) => {
          const r = 70 - i * 13;
          return (
            <g key={h.id} className={`habit-${colorOf(h)}`}>
              <circle cx="80" cy="80" r={r} className="ring-bg" />
              <motion.circle cx="80" cy="80" r={r} className="ring-arc" pathLength={1} initial={{ pathLength: 0 }} animate={{ pathLength: done.has(h.id) ? 1 : 0.02 }} transition={{ duration: 1.1, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }} />
            </g>
          );
        })}
      </svg>
      <span className="today-rings-text">
        {kept}
        <small>/{habits.length}</small>
      </span>
    </div>
  );
}

/** The last seven days, each a dot that fills with how much of that day's habits were kept. */
function WeekStrip({ habits, history, today }: { habits: Habit[]; history: HabitDay[]; today: string }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  return (
    <ol className="week-strip" aria-label="The last seven days">
      {days.map((date) => {
        const kept = new Set(history.find((d) => d.date === date)?.habits ?? []);
        const due = habits.filter((h) => kept.has(h.id) || (isScheduled(h, date) && date >= h.createdAt));
        const share = due.length ? due.filter((h) => kept.has(h.id)).length / due.length : 0;
        const label = fromEntryDate(date).toLocaleDateString(undefined, { weekday: 'short' });
        return (
          <li key={date} className={`week-day ${date === today ? 'today' : ''}`} aria-label={`${label}: ${Math.round(share * 100)}% kept`}>
            <span className="week-dot" style={{ ['--share' as string]: share }} aria-hidden="true" />
            <span className="week-label" aria-hidden="true">
              {label.slice(0, 2)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
