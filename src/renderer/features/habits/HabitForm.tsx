import { useState } from 'react';
import type { HabitInput } from '../../../shared/ipc-contract';
import type { HabitFrequency } from '../../../shared/types/Habit';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  initial?: HabitInput;
  submitLabel: string;
  onSubmit: (input: HabitInput) => Promise<boolean>;
  onCancel?: () => void;
}

export function HabitForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [frequency, setFrequency] = useState<HabitFrequency>(initial?.frequency ?? 'daily');
  const [days, setDays] = useState<number[]>(initial?.customDays ?? [1, 3, 5]);

  return (
    <form
      className="habit-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await onSubmit({ name, frequency, customDays: frequency === 'custom' ? days : undefined });
        if (ok && !initial) setName('');
      }}
    >
      <input className="filter-input grow" placeholder="New habit, e.g. Stretch for 5 minutes" aria-label="Habit name" value={name} onChange={(e) => setName(e.target.value)} />
      <select className="filter-input" aria-label="How often" value={frequency} onChange={(e) => setFrequency(e.target.value as HabitFrequency)}>
        <option value="daily">Every day</option>
        <option value="weekdays">Weekdays</option>
        <option value="custom">Some days</option>
      </select>
      {frequency === 'custom' && (
        <div className="day-picker" role="group" aria-label="Days">
          {DAYS.map((d, i) => (
            <label key={d} className={`day-chip ${days.includes(i) ? 'on' : ''}`}>
              <input type="checkbox" checked={days.includes(i)} onChange={() => setDays((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]))} />
              {d}
            </label>
          ))}
        </div>
      )}
      <button className="btn btn-primary" type="submit" disabled={!name.trim()}>
        {submitLabel}
      </button>
      {onCancel && (
        <button className="btn" type="button" onClick={onCancel}>
          Cancel
        </button>
      )}
    </form>
  );
}
