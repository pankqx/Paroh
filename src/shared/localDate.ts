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

export function addDays(date: string, days: number): string {
  const d = fromEntryDate(date);
  return toEntryDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

/** 0 = Sunday … 6 = Saturday, as `Date#getDay`. */
export function weekday(date: string): number {
  return fromEntryDate(date).getDay();
}
