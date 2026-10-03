import { CalendarClock, ChevronRight, Flag, MessageCircle, Repeat, StickyNote, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Task } from '../../../shared/types/Task';
import { formatShortDate } from '../../domain/dates';
import { deadline } from '../../domain/tasks';

interface Props {
  task: Task;
  today: string;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onRemove: () => void;
  children?: ReactNode;
}

export const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' } as const;

/** One task: a drawn checkbox, the task, a line of its explanation, and chips for deadline, repeat and comments. */
export function TaskCard({ task, today, selected, onToggle, onOpen, onRemove, children }: Props) {
  const due = task.dueDate && !task.done ? deadline(task.dueDate, today) : null;
  const comments = task.comments?.length ?? 0;
  return (
    <li className={`task-card ${task.done ? 'done' : ''} ${selected ? 'selected' : ''} ${task.priority ? `prio-${task.priority}` : ''}`}>
      <input type="checkbox" className="task-check" checked={task.done} onChange={onToggle} aria-label={`${task.done ? 'Reopen' : 'Complete'}: ${task.text}`} />
      <button className="task-main" onClick={onOpen} aria-label={`Open details: ${task.text}`} aria-expanded={selected}>
        <span className="task-title">{task.text}</span>
        {task.notes && (
          <span className="task-notes">
            <StickyNote size={12} aria-hidden="true" />
            {task.notes}
          </span>
        )}
        <span className="task-chips">
          {task.priority && (
            <span className={`task-chip prio prio-${task.priority}`}>
              <Flag size={12} aria-hidden="true" />
              {PRIORITY_LABEL[task.priority]}
            </span>
          )}
          {due && (
            <span className={`task-chip due-${due.tone}`}>
              <CalendarClock size={12} aria-hidden="true" />
              {due.text}
            </span>
          )}
          {task.recurring && (
            <span className="task-chip">
              <Repeat size={12} aria-hidden="true" />
              {task.recurring === 'daily' ? 'Every day' : task.recurring === 'weekdays' ? 'Weekdays' : 'Every week'}
            </span>
          )}
          {comments > 0 && (
            <span className="task-chip">
              <MessageCircle size={12} aria-hidden="true" />
              {comments}
            </span>
          )}
          {task.done && task.doneDate && <span className="task-chip">Done {task.doneDate === today ? 'today' : formatShortDate(task.doneDate)}</span>}
        </span>
      </button>
      <button className="icon-btn task-remove" aria-label={`Delete task: ${task.text}`} onClick={onRemove}>
        <Trash2 size={15} aria-hidden="true" />
      </button>
      <ChevronRight className="task-open-icon" size={16} aria-hidden="true" />
      {children}
    </li>
  );
}
