import { useState } from 'react';
import type { NudgeAction, Task } from '../../../shared/types/Task';
import { formatShortDate } from '../../domain/dates';

/** "Did you finish this?" — a nudge, never a scolding (feature-specifications.md §7). */
export function NudgeMenu({ task, onResolve }: { task: Task; onResolve: (action: NudgeAction, reflection?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState<string | null>(null);
  const since = task.carriedOverFrom ?? task.dueDate;

  if (!open)
    return (
      <button className="nudge-tag" aria-label={`Not finished on ${since ? formatShortDate(since) : 'an earlier day'}. Did you finish this?`} onClick={() => setOpen(true)}>
        Did you finish this? →
      </button>
    );
  if (why !== null)
    return (
      <form
        className="nudge-menu"
        onSubmit={(e) => {
          e.preventDefault();
          onResolve('reflect', why);
        }}
      >
        <input className="filter-input" autoFocus placeholder="What got in the way? (optional)" aria-label="What got in the way" value={why} onChange={(e) => setWhy(e.target.value)} />
        <button className="btn" type="submit">
          Save and move to today
        </button>
      </form>
    );
  return (
    <div className="nudge-menu" role="group" aria-label="Did you finish this?">
      <button className="btn" onClick={() => onResolve('done')}>
        Yes, done
      </button>
      <button className="btn" onClick={() => onResolve('moveToday')}>
        Move to today
      </button>
      <button className="btn" onClick={() => setWhy('')}>
        Not yet, note why
      </button>
    </div>
  );
}
