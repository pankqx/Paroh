import { SEED_HABITS } from '../../../shared/types/Habit';
import { CheckRow } from '../../components/CheckRow';
import { isScheduled } from '../../domain/streak';
import { useHabits } from '../../hooks/useHabits';

export function HabitsCard({ today, onOpenPage }: { today: string; onOpenPage: () => void }) {
  const { habits, todayDone, toggle, create, error } = useHabits(today);
  const active = habits.filter((h) => !h.archived);
  const due = active.filter((h) => isScheduled(h, today) || todayDone.has(h.id));
  const done = due.filter((h) => todayDone.has(h.id)).length;
  const pct = due.length ? Math.round((done / due.length) * 100) : 0;

  return (
    <section className="card daily-card" aria-label="Today’s habits">
      <div className="card-head">
        <h3 className="card-title">Today’s Habits</h3>
        {due.length > 0 && (
          <span className="micro accent-text">
            {done} / {due.length}
          </span>
        )}
      </div>
      {active.length === 0 ? (
        <>
          <p className="muted small">Small things you’d like to do most days. Pick a few to start:</p>
          <div className="seed-list">
            {SEED_HABITS.map((name) => (
              <button key={name} className="chip-btn" onClick={() => void create({ name, frequency: 'daily' })}>
                + {name}
              </button>
            ))}
          </div>
        </>
      ) : due.length === 0 ? (
        <p className="muted small">Nothing scheduled today. Rest counts too.</p>
      ) : (
        <>
          <ul className="check-list">
            {due.map((h) => (
              <CheckRow key={h.id} checked={todayDone.has(h.id)} label={h.name} onToggle={() => void toggle(h.id)} />
            ))}
          </ul>
          <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Habits done today">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="micro muted">{done === due.length ? 'All done for today.' : `${pct}% so far · keep going`}</p>
        </>
      )}
      {error && <p className="error-text">{error}</p>}
      <button className="link-btn card-foot" onClick={onOpenPage}>
        All habits →
      </button>
    </section>
  );
}
