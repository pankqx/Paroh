/** Local calendar date as YYYY-MM-DD. Entries are keyed by the user's own day, not UTC. */
export function toEntryDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromEntryDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export interface CalendarCell {
  date: string;
  day: number;
  inMonth: boolean;
}

/** Monday-first weeks covering the whole month, as in the dashboard reference. Always 6 rows so the card never jumps in height. */
export function monthGrid(year: number, month: number): CalendarCell[][] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const weeks: CalendarCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: CalendarCell[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i);
      week.push({ date: toEntryDate(d), day: d.getDate(), inMonth: d.getMonth() === month });
    }
    weeks.push(week);
  }
  return weeks;
}

export function formatLongDate(date: string): string {
  return fromEntryDate(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatShortDate(date: string): string {
  return fromEntryDate(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
