import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PLAN_AREAS, type PlanArea, type PlanGoal, type PlanGoalInput } from '../../../shared/types/Planner';
import { AREAS } from './areas';

interface Props {
  title: string;
  period: string;
  goals: PlanGoal[];
  onSave: (input: PlanGoalInput, id?: string) => Promise<boolean>;
  onRemove: (id: string) => void;
}

/** Goals for a month or a year, each with a bar you drag to say how far along it is. */
export function GoalList({ title, period, goals, onSave, onRemove }: Props) {
  const [text, setText] = useState('');
  const [area, setArea] = useState<PlanArea>('personal');
  const mine = goals.filter((g) => g.period === period);

  return (
    <section className="planner-panel goal-list" aria-label={title}>
      <h2 className="planner-panel-title">{title}</h2>
      {mine.length === 0 && <p className="planner-empty">Name one or two things that would make this {period.length === 4 ? 'year' : 'month'} feel well spent.</p>}
      <ul className="goals">
        {mine.map((g) => (
          <GoalRow key={g.id} goal={g} onSave={(progress) => void onSave({ ...g, progress }, g.id)} onRemove={() => onRemove(g.id)} />
        ))}
      </ul>
      <form
        className="goal-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await onSave({ period, text, area, progress: 0 })) setText('');
        }}
      >
        <select aria-label="Goal area" value={area} onChange={(e) => setArea(e.target.value as PlanArea)}>
          {PLAN_AREAS.map((a) => (
            <option key={a} value={a}>
              {AREAS[a].label}
            </option>
          ))}
        </select>
        <input className="filter-input grow" placeholder="Add a goal" aria-label="New goal" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="icon-btn" type="submit" aria-label="Add goal" disabled={!text.trim()}>
          <Plus size={16} aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}

/** The bar moves as you drag; the file is written once you let go. */
function GoalRow({ goal, onSave, onRemove }: { goal: PlanGoal; onSave: (progress: number) => void; onRemove: () => void }) {
  const [value, setValue] = useState(goal.progress);
  const { Icon, label } = AREAS[goal.area];
  const commit = () => value !== goal.progress && onSave(value);
  return (
    <li className={`goal area-${goal.area}`}>
      <div className="goal-head">
        <Icon size={15} className="goal-icon" aria-label={label} />
        <span className="goal-text">{goal.text}</span>
        <span className="goal-pct">{value}%</span>
        <button className="icon-btn small goal-remove" aria-label={`Remove goal: ${goal.text}`} onClick={onRemove}>
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </div>
      <input
        type="range"
        className="goal-range"
        min={0}
        max={100}
        step={5}
        value={value}
        aria-label={`Progress on ${goal.text}`}
        style={{ ['--pct' as string]: `${value}%` }}
        onChange={(e) => setValue(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
    </li>
  );
}
