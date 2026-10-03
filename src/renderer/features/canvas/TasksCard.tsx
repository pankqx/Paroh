import { ArrowRight, ListChecks, Plus } from 'lucide-react';
import { useState } from 'react';
import { CheckRow } from '../../components/CheckRow';
import { groupTasks } from '../../domain/tasks';
import { useTasks } from '../../hooks/useTasks';
import { NudgeMenu } from '../todo/NudgeMenu';

export function TasksCard({ today, onOpenPage }: { today: string; onOpenPage: () => void }) {
  const { tasks, create, toggle, resolveNudge, error } = useTasks();
  const [text, setText] = useState('');
  const g = groupTasks(tasks, today);
  const doneToday = g.done.filter((t) => t.doneDate === today && t.dueDate === today);

  async function add() {
    if (!text.trim()) return;
    if (await create({ text, dueDate: today })) setText('');
  }

  return (
    <section className="card daily-card" aria-label="Today’s tasks">
      <div className="card-head">
        <div className="card-head-title">
          <span className="card-icon green">
            <ListChecks size={16} strokeWidth={1.9} aria-hidden="true" />
          </span>
          <h2 className="card-title">Today’s Tasks</h2>
        </div>
      </div>
      <ul className="check-list">
        {g.nudges.map((t) => (
          <CheckRow key={t.id} checked={false} label={t.text} onToggle={() => void toggle(t.id)}>
            <NudgeMenu task={t} onResolve={(a, why) => void resolveNudge(t.id, a, why)} />
          </CheckRow>
        ))}
        {[...g.today, ...doneToday].map((t) => (
          <CheckRow key={t.id} checked={t.done} label={t.text} onToggle={() => void toggle(t.id)} />
        ))}
      </ul>
      {g.nudges.length + g.today.length + doneToday.length === 0 && <p className="muted small">Nothing on your list. Add one, or just write.</p>}
      <form
        className="quick-add"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input className="filter-input grow" placeholder="Add a task for today" aria-label="Add a task for today" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="icon-btn add-btn" type="submit" aria-label="Add task">
          <Plus size={18} aria-hidden="true" />
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
      <button className="link-btn card-foot" onClick={onOpenPage}>
        All tasks <ArrowRight size={14} aria-hidden="true" />
      </button>
    </section>
  );
}
