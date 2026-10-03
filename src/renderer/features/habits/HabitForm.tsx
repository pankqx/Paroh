import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import type { HabitInput } from '../../../shared/ipc-contract';
import { HABIT_COLORS, type HabitColor, type HabitFrequency } from '../../../shared/types/Habit';
import { HABIT_COLOR_LABEL } from './habitColor';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FREQS: { id: HabitFrequency; label: string }[] = [
  { id: 'daily', label: 'Every day' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'custom', label: 'Some days' },
];

interface Props {
  initial?: HabitInput;
  submitLabel: string;
  onSubmit: (input: HabitInput) => Promise<boolean>;
  onCancel?: () => void;
  /** The colour a new habit would get if none is picked. */
  defaultColor?: HabitColor;
}

export function HabitForm({ initial, submitLabel, onSubmit, onCancel, defaultColor = 'ember' }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [frequency, setFrequency] = useState<HabitFrequency>(initial?.frequency ?? 'daily');
  const [days, setDays] = useState<number[]>(initial?.customDays ?? [1, 3, 5]);
  const [color, setColor] = useState<HabitColor | undefined>(initial?.color);
  const shown = color ?? defaultColor;

  return (
    <form
      className={`habit-form habit-${shown} ${initial ? 'editing' : ''}`}
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await onSubmit({ name, frequency, customDays: frequency === 'custom' ? days : undefined, color });
        if (ok && !initial) {
          setName('');
          setColor(undefined);
        }
      }}
    >
      <div className="composer-row">
        {!initial && <Plus size={18} className="composer-plus" aria-hidden="true" />}
        <input className="composer-input" placeholder="A new habit, like “Stretch for 5 minutes”" aria-label="Habit name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="composer-options">
        <div className="segmented" role="group" aria-label="How often">
          {FREQS.map((f) => (
            <button key={f.id} type="button" className={`seg-btn ${frequency === f.id ? 'on' : ''}`} aria-pressed={frequency === f.id} onClick={() => setFrequency(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
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
        <div className="habit-colors" role="radiogroup" aria-label="Colour">
          {HABIT_COLORS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={shown === c} aria-label={HABIT_COLOR_LABEL[c]} title={HABIT_COLOR_LABEL[c]} className={`habit-swatch habit-${c} ${shown === c ? 'on' : ''}`} onClick={() => setColor(c)}>
              {shown === c && <Check size={12} strokeWidth={3} aria-hidden="true" />}
            </button>
          ))}
        </div>
        <span className="composer-add">
          {onCancel && (
            <button className="btn btn-ghost" type="button" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button className="btn btn-primary" type="submit" disabled={!name.trim()}>
            {submitLabel}
          </button>
        </span>
      </div>
    </form>
  );
}
