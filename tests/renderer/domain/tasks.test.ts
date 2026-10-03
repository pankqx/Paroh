import { describe, expect, it } from 'vitest';
import type { Task } from '../../../src/shared/types/Task';
import { byPriority, deadline, todayProgress } from '../../../src/renderer/domain/tasks';

const today = '2026-10-03'; // a Saturday
const task = (t: Partial<Task>): Task => ({ id: Math.random().toString(), text: 't', createdDate: '2026-10-01', done: false, ...t });

describe('deadline', () => {
  it('reads like a person would say it', () => {
    expect(deadline('2026-10-01', today)).toEqual({ text: '2 days late', tone: 'overdue' });
    expect(deadline('2026-10-02', today)).toEqual({ text: 'Yesterday', tone: 'overdue' });
    expect(deadline(today, today)).toEqual({ text: 'Today', tone: 'today' });
    expect(deadline('2026-10-04', today)).toEqual({ text: 'Tomorrow', tone: 'soon' });
    expect(deadline('2026-10-07', today).tone).toBe('soon');
    expect(deadline('2026-10-20', today).tone).toBe('later');
  });
});

describe('todayProgress', () => {
  it('counts what was due by today and what was finished today', () => {
    const tasks = [
      task({ dueDate: today, done: true, doneDate: today }),
      task({ dueDate: '2026-10-01' }),
      task({ dueDate: '2026-10-09' }),
      task({}),
      task({ dueDate: '2026-09-01', done: true, doneDate: '2026-09-01' }),
    ];
    expect(todayProgress(tasks, today)).toEqual({ done: 1, total: 2 });
  });
});

describe('byPriority', () => {
  it('puts high first and low last, with unmarked tasks between', () => {
    const list = [task({ text: 'low', priority: 'low' }), task({ text: 'none' }), task({ text: 'high', priority: 'high' })];
    expect(list.sort(byPriority).map((t) => t.text)).toEqual(['high', 'none', 'low']);
  });
});
