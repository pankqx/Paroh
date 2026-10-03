const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isReminderTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_RE.test(value);
}

/** Milliseconds from `now` until the next local `HH:MM` (today if still ahead, else tomorrow). */
export function msUntilNext(time: string, now: Date): number {
  const [h, m] = time.split(':').map(Number);
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}
