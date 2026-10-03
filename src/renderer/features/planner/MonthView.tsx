import { Flag, NotebookPen, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatLongDate } from '../../domain/dates';
import type { EntrySummary } from '../../../shared/types/Entry';
import type { PlanArea, PlanEvent, PlanGoal, PlanGoalInput } from '../../../shared/types/Planner';
import type { Task } from '../../../shared/types/Task';
import { monthGrid } from '../../domain/dates';
import { eventsOn, formatTime, weekRows } from '../../domain/planner';
import { byPriority, deadline } from '../../domain/tasks';
import { AREAS } from './areas';
import { GoalList } from './GoalList';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props {
  month: string;
  today: string;
  events: PlanEvent[];
  goals: PlanGoal[];
  tasks: Task[];
  entries: EntrySummary[];
  focus: PlanArea | null;
  onFocus: (area: PlanArea | null) => void;
  onNewPlan: (date: string) => void;
  onOpenPlan: (event: PlanEvent) => void;
  onOpenEntry: (date: string) => void;
  onSaveGoal: (input: PlanGoalInput, id?: string) => Promise<boolean>;
  onRemoveGoal: (id: string) => void;
}

export function MonthView({ month, today, events, goals, tasks, entries, focus, onFocus, onNewPlan, onOpenPlan, onOpenEntry, onSaveGoal, onRemoveGoal }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const day = picked && picked.startsWith(month) ? picked : today.startsWith(month) ? today : `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const weeks = monthGrid(y, m - 1);
  const written = new Set(entries.map((e) => e.date));
  const inMonth = (d?: string) => Boolean(d && d.slice(0, 7) === month);
  const monthEvents = events.filter((e) => e.start.slice(0, 7) <= month && (e.end ?? e.start).slice(0, 7) >= month);
  const shown = focus ? events.filter((e) => e.area === focus) : events;
  const areaCounts = Object.keys(AREAS)
    .map((a) => [a as PlanArea, monthEvents.filter((e) => e.area === a).length] as const)
    .filter(([, n]) => n > 0);
  const priorities = tasks
    .filter((t) => !t.done && t.dueDate && (inMonth(t.dueDate) || t.dueDate < today))
    .sort((a, b) => byPriority(a, b) || (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, 5);
  const tasksDone = tasks.filter((t) => t.done && inMonth(t.doneDate)).length;
  const tasksPlanned = tasks.filter((t) => inMonth(t.dueDate) || (t.done && inMonth(t.doneDate))).length;
  const pages = entries.filter((e) => inMonth(e.date)).length;
  const dueByDay = new Map<string, number>();
  for (const t of tasks) if (!t.done && t.dueDate) dueByDay.set(t.dueDate, (dueByDay.get(t.dueDate) ?? 0) + 1);

  return (
    <div className="month-layout">
      <div className="month-main">
        {areaCounts.length > 0 && (
          <div className="focus-areas" role="group" aria-label="Show one area">
            {areaCounts.map(([a, n]) => {
              const { label, Icon } = AREAS[a];
              return (
                <button key={a} className={`focus-chip area-${a} ${focus === a ? 'on' : ''}`} aria-pressed={focus === a} onClick={() => onFocus(focus === a ? null : a)}>
                  <span className="focus-icon">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="focus-label">{label}</span>
                    <span className="focus-count">
                      {n} {n === 1 ? 'plan' : 'plans'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="month-grid" role="grid" aria-label="Month">
          <div className="month-weekdays" role="row">
            {WEEKDAYS.map((d) => (
              <span key={d} role="columnheader" className="month-weekday">
                {d}
              </span>
            ))}
          </div>
          {weeks.map((week) => {
            const rows = weekRows(
              shown,
              week.map((c) => c.date),
            );
            return (
              <div key={week[0].date} className="month-week" role="row">
                {week.map((cell) => {
                  const plans = rows.get(cell.date)!;
                  const extra = plans.slice(3).filter(Boolean).length;
                  const due = dueByDay.get(cell.date);
                  return (
                    <div
                      key={cell.date}
                      role="gridcell"
                      aria-selected={cell.date === day}
                      className={`month-cell ${cell.inMonth ? '' : 'outside'} ${cell.date === today ? 'today' : ''} ${cell.date < today ? 'past' : ''} ${cell.date === day ? 'picked' : ''}`}
                      onClick={(e) => !(e.target as HTMLElement).closest('button') && setPicked(cell.date)}
                    >
                      <div className="month-cell-head">
                        <span className="month-day-num">{cell.day}</span>
                        {written.has(cell.date) && (
                          <button className="month-entry-dot" aria-label={`Open the entry for ${cell.date}`} title="You wrote this day" onClick={() => onOpenEntry(cell.date)}>
                            <NotebookPen size={11} aria-hidden="true" />
                          </button>
                        )}
                        {due ? (
                          <span className="month-due" title={`${due} ${due === 1 ? 'task' : 'tasks'} due`}>
                            {due}
                          </span>
                        ) : null}
                        <button className="month-add" aria-label={`Add a plan on ${cell.date}`} onClick={() => onNewPlan(cell.date)}>
                          <Plus size={13} aria-hidden="true" />
                        </button>
                      </div>
                      <div className="month-events">
                        {plans.slice(0, 3).map((e, lane) => {
                          if (!e) return <span key={`gap-${lane}`} className="plan-gap" aria-hidden="true" />;
                          const labelled = !e.end || e.start === cell.date || cell === week[0];
                          return (
                            <button
                              key={e.id}
                              className={`plan-chip area-${e.area} ${e.end ? 'span' : ''} ${e.end && e.start !== cell.date ? 'continues' : ''} ${e.end && e.end !== cell.date && cell !== week[6] ? 'runs-on' : ''} ${labelled ? '' : 'quiet'}`}
                              onClick={() => onOpenPlan(e)}
                              title={e.title}
                              aria-label={labelled ? undefined : `${e.title}, continued`}
                            >
                              {labelled && e.milestone && <Flag size={11} aria-hidden="true" />}
                              {labelled && <span className="plan-chip-title">{e.title}</span>}
                              {e.time && <span className="plan-chip-time">{formatTime(e.time)}</span>}
                            </button>
                          );
                        })}
                        {extra > 0 && <span className="month-more">+{extra} more</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <section className="planner-panel day-agenda" aria-label={`Plans on ${formatLongDate(day)}`}>
          <div className="day-agenda-head">
            <h2 className="planner-panel-title">{formatLongDate(day)}</h2>
            <button className="btn btn-small" onClick={() => onNewPlan(day)}>
              <Plus size={14} aria-hidden="true" />
              Add plan
            </button>
          </div>
          {eventsOn(shown, day).length === 0 ? (
            <p className="planner-empty">Nothing planned. Pick a day on the calendar to see its plans.</p>
          ) : (
            <ul className="agenda">
              {eventsOn(shown, day).map((e) => (
                <li key={e.id}>
                  <button className={`agenda-item area-${e.area}`} onClick={() => onOpenPlan(e)}>
                    <span className="agenda-time">{e.time ? formatTime(e.time) : e.end ? 'All days' : 'All day'}</span>
                    <span className="agenda-title">
                      {e.milestone && <Flag size={13} aria-hidden="true" />}
                      {e.title}
                    </span>
                    {e.notes && <span className="agenda-notes">{e.notes}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="area-legend" aria-hidden="true">
          {Object.entries(AREAS).map(([a, { label }]) => (
            <span key={a} className={`legend-item area-${a}`}>
              <span className="legend-dot" />
              {label}
            </span>
          ))}
        </div>
      </div>

      <aside className="month-rail">
        <section className="planner-panel" aria-label="Top priorities">
          <h2 className="planner-panel-title">Top priorities</h2>
          {priorities.length === 0 ? (
            <p className="planner-empty">No tasks due this month. Deadlines from To-Do show up here.</p>
          ) : (
            <ol className="priorities">
              {priorities.map((t, i) => {
                const d = deadline(t.dueDate!, today);
                return (
                  <li key={t.id} className={t.priority ? `prio-${t.priority}` : ''}>
                    <span className="priority-num">{i + 1}</span>
                    <span className="priority-text">{t.text}</span>
                    <span className={`task-chip due-${d.tone}`}>{d.text}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
        <GoalList title="This month’s goals" period={month} goals={goals} onSave={onSaveGoal} onRemove={onRemoveGoal} />
        <section className="planner-panel" aria-label="This month at a glance">
          <h2 className="planner-panel-title">At a glance</h2>
          <div className="glance">
            <Glance value={monthEvents.length} label="plans" tone="accent" />
            <Glance value={`${tasksDone}/${tasksPlanned}`} label="tasks done" tone="success" />
            <Glance value={pages} label={pages === 1 ? 'page written' : 'pages written'} tone="gold" />
            <Glance value={monthEvents.filter((e) => e.milestone).length} label="milestones" tone="plum" />
          </div>
        </section>
      </aside>
    </div>
  );
}

function Glance({ value, label, tone }: { value: number | string; label: string; tone: string }) {
  return (
    <div className={`glance-tile tone-${tone}`}>
      <span className="glance-value">{value}</span>
      <span className="glance-label">{label}</span>
    </div>
  );
}
