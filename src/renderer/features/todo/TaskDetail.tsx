import { CalendarClock, Flag, MessageCircle, Repeat, Send, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { TaskInput } from '../../../shared/ipc-contract';
import type { Priority, Recurrence, Task } from '../../../shared/types/Task';
import { formatLongDate } from '../../domain/dates';
import { PRIORITY_LABEL } from './TaskCard';

interface Props {
  task: Task;
  today: string;
  onClose: () => void;
  onUpdate: (input: TaskInput) => Promise<boolean>;
  onComment: (text: string) => Promise<boolean>;
  onUncomment: (commentId: string) => void;
  onRemove: () => void;
}

const PRIORITIES: (Priority | undefined)[] = [undefined, 'low', 'medium', 'high'];

/**
 * Everything about one task: what it is, a small explanation, its deadline, how it repeats, how much it
 * matters, and a running thread of comments. Text saves when you leave the field; choices save at once.
 */
export function TaskDetail({ task, today, onClose, onUpdate, onComment, onUncomment, onRemove }: Props) {
  const [text, setText] = useState(task.text);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [comment, setComment] = useState('');
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, [task.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const base: TaskInput = { text: task.text, dueDate: task.dueDate, recurring: task.recurring, notes: task.notes, priority: task.priority };
  const save = (patch: Partial<TaskInput>) => {
    const next = { ...base, ...patch };
    // A repeat needs a start date; clearing the date also clears the repeat.
    if (!next.dueDate) next.recurring = undefined;
    return onUpdate(next);
  };

  async function send() {
    if (comment.trim() && (await onComment(comment))) setComment('');
  }

  return (
    <motion.aside
      className="task-detail"
      aria-label={`Task details: ${task.text}`}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="task-detail-head">
        <span className="eyebrow">{task.done ? 'Done' : 'Task'}</span>
        <button className="icon-btn small" aria-label="Close details" onClick={onClose}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <textarea
        ref={titleRef}
        className="task-detail-title"
        aria-label="Task"
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value.replace(/\n/g, ' '))}
        onBlur={() => text.trim() && text !== task.text && void save({ text })}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), e.currentTarget.blur())}
      />
      <label className="field">
        <span>A small explanation</span>
        <textarea
          className="filter-input"
          placeholder="Why it matters, what done looks like, links…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (task.notes ?? '') && void save({ notes })}
        />
      </label>

      <div className="task-detail-grid">
        <label className="field">
          <span>
            <CalendarClock size={13} aria-hidden="true" /> Deadline
          </span>
          <input className="filter-input" type="date" value={task.dueDate ?? ''} onChange={(e) => void save({ dueDate: e.target.value || undefined })} />
        </label>
        <label className="field">
          <span>
            <Repeat size={13} aria-hidden="true" /> Repeat
          </span>
          <select value={task.recurring ?? ''} disabled={!task.dueDate} onChange={(e) => void save({ recurring: (e.target.value || undefined) as Recurrence | undefined })}>
            <option value="">Doesn’t repeat</option>
            <option value="daily">Every day</option>
            <option value="weekdays">Weekdays</option>
            <option value="weekly">Every week</option>
          </select>
        </label>
      </div>
      {task.dueDate && (
        <p className="task-detail-due micro muted">
          {task.dueDate === today ? 'Due today' : `Due ${formatLongDate(task.dueDate)}`}
        </p>
      )}

      <fieldset className="field">
        <legend>
          <Flag size={13} aria-hidden="true" /> Priority
        </legend>
        <div className="segmented prio-seg">
          {PRIORITIES.map((p) => (
            <button key={p ?? 'none'} className={`seg-btn ${task.priority === p ? 'on' : ''} ${p ? `prio-${p}` : ''}`} aria-pressed={task.priority === p} onClick={() => void save({ priority: p })}>
              {p ? PRIORITY_LABEL[p] : 'None'}
            </button>
          ))}
        </div>
      </fieldset>

      <section className="task-comments" aria-label="Comments">
        <h3 className="task-comments-title">
          <MessageCircle size={15} aria-hidden="true" /> Comments <span className="muted">{task.comments?.length || ''}</span>
        </h3>
        {!task.comments?.length && <p className="muted small">Leave notes as things move along, like “emailed them, waiting to hear back”.</p>}
        <ol className="comment-list">
          {task.comments?.map((c) => (
            <li key={c.id} className="comment">
              <div className="comment-meta">
                <time dateTime={c.at}>{new Date(c.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>
                <button className="link-btn comment-delete" aria-label="Delete comment" onClick={() => onUncomment(c.id)}>
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </div>
              <p>{c.text}</p>
            </li>
          ))}
        </ol>
        <form
          className="comment-form"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input className="filter-input grow" placeholder="Add a comment" aria-label="Add a comment" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="btn btn-primary btn-small" type="submit" disabled={!comment.trim()} aria-label="Post comment">
            <Send size={14} aria-hidden="true" />
          </button>
        </form>
      </section>

      <button className="btn btn-ghost task-detail-delete" onClick={onRemove}>
        <Trash2 size={15} aria-hidden="true" />
        Delete task
      </button>
    </motion.aside>
  );
}
