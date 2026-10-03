import { Flag } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { EntrySummary } from '../../../shared/types/Entry';
import type { PlanArea, PlanEvent, PlanGoal, PlanGoalInput } from '../../../shared/types/Planner';
import { monthGrid } from '../../domain/dates';
import { dayOfYear, daysInYear, eventsOn, yearSpans } from '../../domain/planner';
import { AREAS } from './areas';
import { GoalList } from './GoalList';

const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'short' }));
const LONG_MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'long' }));
const DAY_W = 6;

interface Props {
  year: number;
  today: string;
  events: PlanEvent[];
  goals: PlanGoal[];
  entries: EntrySummary[];
  focus: PlanArea | null;
  onOpenMonth: (month: string) => void;
  onOpenPlan: (event: PlanEvent) => void;
  onSaveGoal: (input: PlanGoalInput, id?: string) => Promise<boolean>;
  onRemoveGoal: (id: string) => void;
}

/** The whole year at once: a ribbon of plans across twelve months, then twelve quiet little calendars. */
export function YearView({ year, today, events, goals, entries, focus, onOpenMonth, onOpenPlan, onSaveGoal, onRemoveGoal }: Props) {
  const shown = focus ? events.filter((e) => e.area === focus) : events;
  const labelDays = (e: PlanEvent) => Math.ceil((e.title.length * 7.2 + 34) / DAY_W);
  const spans = yearSpans(shown, year, labelDays);
  const lanes = Math.max(3, ...spans.map((s) => s.lane + 1));
  const total = daysInYear(year);
  const ribbon = useRef<HTMLDivElement>(null);
  const isThisYear = today.startsWith(String(year));
  const written = new Set(entries.map((e) => e.date));
  const yearEntries = entries.filter((e) => e.date.startsWith(String(year))).length;
  const yearPlans = events.filter((e) => e.start.startsWith(String(year))).length;
  const milestones = events.filter((e) => e.milestone && e.start.startsWith(String(year)));

  // Open on today, as a map opens on where you are.
  useEffect(() => {
    const el = ribbon.current;
    if (el && isThisYear) el.scrollLeft = dayOfYear(today) * DAY_W - el.clientWidth / 2;
  }, [isThisYear, today, year]);

  return (
    <div className="year-layout">
      <section className="year-ribbon-wrap" aria-label={`Plans across ${year}`}>
        <div className="year-ribbon" ref={ribbon} tabIndex={0} aria-label="Year timeline, scroll sideways">
          <div className="ribbon-inner" style={{ width: total * DAY_W, height: 64 + lanes * 34 }}>
            {MONTHS.map((name, i) => {
              const from = dayOfYear(`${year}-${String(i + 1).padStart(2, '0')}-01`);
              return (
                <button key={name} className="ribbon-month" style={{ left: from * DAY_W }} onClick={() => onOpenMonth(`${year}-${String(i + 1).padStart(2, '0')}`)}>
                  {LONG_MONTHS[i]}
                </button>
              );
            })}
            <div className="ribbon-ticks" aria-hidden="true" style={{ backgroundSize: `${DAY_W * 7}px 100%` }} />
            {isThisYear && <div className="ribbon-today" style={{ left: dayOfYear(today) * DAY_W + DAY_W / 2 }} aria-hidden="true" />}
            {spans.map(({ event, from, to, lane }) => (
              <button
                key={event.id}
                className={`ribbon-span area-${event.area} ${event.milestone ? 'milestone' : ''} ${from === to ? 'single' : to - from + 1 < labelDays(event) ? 'narrow' : ''}`}
                style={{ left: from * DAY_W, width: Math.max(DAY_W, (to - from + 1) * DAY_W), top: 56 + lane * 34 }}
                onClick={() => onOpenPlan(event)}
                title={event.title}
              >
                {event.milestone && <Flag size={12} aria-hidden="true" />}
                <span>{event.title}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="year-body">
        <div className="year-months">
          {LONG_MONTHS.map((name, i) => {
            const month = `${year}-${String(i + 1).padStart(2, '0')}`;
            const weeks = monthGrid(year, i);
            const isNow = today.startsWith(month);
            return (
              <button key={month} className={`mini-month ${isNow ? 'now' : ''} ${month < today.slice(0, 7) ? 'gone' : ''}`} onClick={() => onOpenMonth(month)} aria-label={`Open ${name} ${year}`}>
                <span className="mini-month-name">{name}</span>
                <span className="mini-grid" aria-hidden="true">
                  {weeks.flat().map((cell) => {
                    if (!cell.inMonth) return <span key={cell.date} className="mini-day blank" />;
                    const plans = eventsOn(shown, cell.date);
                    return (
                      <span key={cell.date} className={`mini-day ${written.has(cell.date) ? 'written' : ''} ${cell.date === today ? 'today' : ''} ${plans.length ? `has-plan area-${plans[0].area}` : ''}`}>
                        {cell.day}
                      </span>
                    );
                  })}
                </span>
              </button>
            );
          })}
        </div>
        <aside className="year-rail">
          <GoalList title={`Goals for ${year}`} period={String(year)} goals={goals} onSave={onSaveGoal} onRemove={onRemoveGoal} />
          <section className="planner-panel" aria-label={`${year} at a glance`}>
            <h2 className="planner-panel-title">The year so far</h2>
            <div className="glance">
              <div className="glance-tile tone-gold">
                <span className="glance-value">{yearEntries}</span>
                <span className="glance-label">pages written</span>
              </div>
              <div className="glance-tile tone-accent">
                <span className="glance-value">{yearPlans}</span>
                <span className="glance-label">plans made</span>
              </div>
            </div>
            {milestones.length > 0 && (
              <ol className="milestones">
                {milestones.map((m) => (
                  <li key={m.id} className={`area-${m.area}`}>
                    <button className="link-btn" onClick={() => onOpenPlan(m)}>
                      <Flag size={13} aria-hidden="true" />
                      {m.title}
                    </button>
                    <span className="micro muted">{new Date(`${m.start}T00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <div className="area-legend vertical" aria-hidden="true">
            {Object.entries(AREAS).map(([a, { label }]) => (
              <span key={a} className={`legend-item area-${a}`}>
                <span className="legend-dot" />
                {label}
              </span>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
