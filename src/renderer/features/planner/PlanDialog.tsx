import { Flag, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { PLAN_AREAS, type PlanArea, type PlanEvent, type PlanEventInput } from '../../../shared/types/Planner';
import { AREAS } from './areas';

interface Props {
  /** An existing plan to edit, or the day a new one starts on. */
  event?: PlanEvent;
  date: string;
  onSave: (input: PlanEventInput) => Promise<boolean>;
  onRemove?: () => void;
  onClose: () => void;
}

export function PlanDialog({ event, date, onSave, onRemove, onClose }: Props) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [start, setStart] = useState(event?.start ?? date);
  const [end, setEnd] = useState(event?.end ?? '');
  const [time, setTime] = useState(event?.time ?? '');
  const [area, setArea] = useState<PlanArea>(event?.area ?? 'personal');
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [milestone, setMilestone] = useState(Boolean(event?.milestone));
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const span = Boolean(end && end !== start);

  return (
    <div className="plan-scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        className={`plan-dialog area-${area}`}
        role="dialog"
        aria-modal="true"
        aria-label={event ? 'Edit plan' : 'New plan'}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <form
          className="plan-dialog-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await onSave({ title, start, end: end || undefined, time: span ? undefined : time || undefined, area, notes, milestone })) onClose();
          }}
        >
          <div className="plan-dialog-head">
            <span className="eyebrow">{event ? 'Plan' : 'New plan'}</span>
            <button type="button" className="icon-btn small" aria-label="Close" onClick={onClose}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <input ref={first} className="plan-title-input" placeholder="What’s happening?" aria-label="Plan" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="plan-areas" role="radiogroup" aria-label="Area">
            {PLAN_AREAS.map((a) => {
              const { label, Icon } = AREAS[a];
              return (
                <button key={a} type="button" role="radio" aria-checked={area === a} className={`plan-area-chip area-${a} ${area === a ? 'on' : ''}`} onClick={() => setArea(a)}>
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>
          <div className="plan-dates">
            <label className="field">
              <span>Starts</span>
              <input className="filter-input" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
            </label>
            <label className="field">
              <span>Ends (optional)</span>
              <input className="filter-input" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
            </label>
            <label className="field">
              <span>Time</span>
              <input className="filter-input" type="time" value={span ? '' : time} disabled={span} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>Note</span>
            <textarea className="filter-input" placeholder="Anything to remember" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <label className="switch-label plan-milestone">
            <input type="checkbox" role="switch" checked={milestone} onChange={(e) => setMilestone(e.target.checked)} />
            <Flag size={14} aria-hidden="true" />A milestone, shown large on the year
          </label>
          <div className="plan-dialog-foot">
            {onRemove && (
              <button type="button" className="btn btn-ghost plan-delete" onClick={onRemove}>
                <Trash2 size={15} aria-hidden="true" />
                Delete
              </button>
            )}
            <span className="grow" />
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
              {event ? 'Save' : 'Add plan'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
