import { useMemo, useState } from 'react';
import type { EntrySummary } from '../../../shared/types/Entry';
import { MOOD_EMOJI } from '../../components/MoodSelector';
import { fromEntryDate, monthGrid } from '../../domain/dates';
import { MoodTrendChart } from './MoodTrendChart';

interface Props {
  today: string;
  entries: EntrySummary[];
  onOpenEntry: (date: string) => void;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function CalendarPage({ today, entries, onOpenEntry }: Props) {
  const t = fromEntryDate(today);
  const [cursor, setCursor] = useState({ year: t.getFullYear(), month: t.getMonth() });
  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const byDate = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries]);
  const label = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const inMonth = entries.filter((e) => e.date.startsWith(`${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`));

  const shift = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">{label}</h1>
        <div className="page-head-actions">
          <span className="muted micro">
            {inMonth.length} {inMonth.length === 1 ? 'entry' : 'entries'} this month
          </span>
          <button className="btn" onClick={() => setCursor({ year: t.getFullYear(), month: t.getMonth() })}>
            Today
          </button>
          <button className="icon-btn" aria-label="Previous month" onClick={() => shift(-1)}>
            ‹
          </button>
          <button className="icon-btn" aria-label="Next month" onClick={() => shift(1)}>
            ›
          </button>
        </div>
      </div>
      <MoodTrendChart entries={entries} today={today} />
      <div className="big-calendar" role="grid" aria-label={label}>
        <div className="big-calendar-row" role="row">
          {WEEKDAYS.map((d) => (
            <div key={d} className="big-calendar-weekday" role="columnheader">
              {d.slice(0, 3)}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0].date} className="big-calendar-row" role="row">
            {week.map((cell) => {
              const entry = byDate.get(cell.date);
              const future = cell.date > today;
              return (
                <div key={cell.date} role="gridcell" className="big-calendar-cell-wrap">
                  <button
                    className={`big-calendar-cell ${cell.inMonth ? '' : 'outside'} ${cell.date === today ? 'today' : ''} ${entry?.mood ? `mood-${entry.mood}` : ''}`}
                    disabled={future && !entry}
                    onClick={() => onOpenEntry(cell.date)}
                    aria-label={`${cell.date}${entry ? `: ${entry.title || 'Untitled'}` : ''}`}
                  >
                    <span className="big-calendar-day">{cell.day}</span>
                    {entry && (
                      <span className="big-calendar-entry">
                        {entry.mood && <span aria-hidden>{MOOD_EMOJI[entry.mood]} </span>}
                        {entry.title || 'Untitled'}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
