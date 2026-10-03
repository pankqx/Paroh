import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { EntrySummary } from '../../../shared/types/Entry';
import { fromEntryDate, monthGrid } from '../../domain/dates';

interface Props {
  today: string;
  entries: EntrySummary[];
  onOpenEntry: (date: string) => void;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function MiniCalendarCard({ today, entries, onOpenEntry }: Props) {
  const t = fromEntryDate(today);
  const [cursor, setCursor] = useState({ year: t.getFullYear(), month: t.getMonth() });
  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const byDate = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries]);
  const label = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const shift = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <section className="card calendar-card" aria-label="Calendar">
      <div className="calendar-head">
        <h2 className="card-title">{label}</h2>
        <div>
          <button className="icon-btn" aria-label="Previous month" onClick={() => shift(-1)}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button className="icon-btn" aria-label="Next month" onClick={() => shift(1)}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <table className="calendar">
        <thead>
          <tr>
            {WEEKDAYS.map((d) => (
              <th key={d} scope="col">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].date}>
              {week.map((cell) => {
                const hasEntry = byDate.has(cell.date);
                const isFuture = cell.date > today;
                return (
                  <td key={cell.date}>
                    {cell.inMonth && (
                      <button
                        className={`day ${cell.date === today ? 'today' : ''}`}
                        disabled={isFuture}
                        aria-label={`${cell.date}${hasEntry ? ', has an entry' : ''}`}
                        onClick={() => onOpenEntry(cell.date)}
                      >
                        {cell.day}
                        <span className={dotClass(byDate.get(cell.date))} />
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function dotClass(entry?: EntrySummary): string {
  if (!entry) return 'dot';
  return entry.mood ? `dot visible mood-${entry.mood}` : 'dot visible';
}
