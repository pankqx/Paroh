import type { VaultFs } from '../../shared/fs/VaultFs';
import type { TaskInput } from '../../shared/ipc-contract';
import { toEntryDate } from '../../shared/localDate';
import { nextOccurrence } from '../../shared/recurrence';
import { isEntryDate } from '../../shared/types/Entry';
import { err, ok, type Result } from '../../shared/types/Result';
import type { NudgeAction, Task } from '../../shared/types/Task';
import { readJsonFile, writeJsonFile } from '../vault/jsonFile';

interface TasksFile {
  schema_version: 1;
  tasks: Task[];
}

/** Tasks span days and recur, so they get their own store in `.paroh/tasks.json` (feature-specifications.md §7). */
export class TaskStore {
  private readonly path: string;

  constructor(
    private fs: VaultFs,
    private today: () => string = () => toEntryDate(new Date()),
  ) {
    this.path = '.paroh/tasks.json';
  }

  list(): Promise<Result<Task[]>> {
    return attempt(async () => (await this.read()).tasks);
  }

  async create(input: TaskInput): Promise<Result<Task>> {
    const problem = validate(input);
    if (problem) return err(problem);
    return this.write((tasks) => {
      const task: Task = { id: crypto.randomUUID(), text: input.text.trim(), createdDate: this.today(), done: false, ...optional(input) };
      tasks.push(task);
      return task;
    });
  }

  async update(id: string, input: TaskInput): Promise<Result<Task>> {
    const problem = validate(input);
    if (problem) return err(problem);
    return this.write((tasks) => {
      const task = find(tasks, id);
      task.text = input.text.trim();
      if (input.dueDate) task.dueDate = input.dueDate;
      else delete task.dueDate;
      if (input.recurring) task.recurring = input.recurring;
      else delete task.recurring;
      return task;
    });
  }

  /** Marking a recurring task done leaves this instance done and schedules the next one (§7 edge cases). */
  toggle(id: string): Promise<Result<Task>> {
    return this.write((tasks) => {
      const task = find(tasks, id);
      if (task.done) {
        task.done = false;
        delete task.doneDate;
        return task;
      }
      task.done = true;
      task.doneDate = this.today();
      if (task.recurring) {
        const from = task.dueDate && task.dueDate > this.today() ? task.dueDate : this.today();
        const due = nextOccurrence(task.recurring, from);
        const exists = tasks.some((t) => !t.done && t.text === task.text && t.recurring === task.recurring && t.dueDate === due);
        if (!exists) tasks.push({ id: crypto.randomUUID(), text: task.text, createdDate: this.today(), dueDate: due, done: false, recurring: task.recurring });
      }
      return task;
    });
  }

  /** "Did you finish this?" — done, move to today, or a short reflection (which also moves it to today). */
  resolveNudge(id: string, action: NudgeAction, reflection?: string): Promise<Result<Task>> {
    return this.write((tasks) => {
      const task = find(tasks, id);
      const today = this.today();
      if (action === 'done') {
        task.done = true;
        task.doneDate = today;
        return task;
      }
      if (task.dueDate && task.dueDate < today) task.carriedOverFrom ??= task.dueDate;
      task.dueDate = today;
      if (action === 'reflect' && reflection?.trim()) task.stallReflection = reflection.trim().slice(0, 500);
      return task;
    });
  }

  remove(id: string): Promise<Result<void>> {
    return this.write((tasks) => {
      tasks.splice(tasks.indexOf(find(tasks, id)), 1);
    });
  }

  private queue: Promise<unknown> = Promise.resolve();

  /** Read-modify-write, one at a time, so two quick clicks can't overwrite each other. */
  private write<T>(change: (tasks: Task[]) => T): Promise<Result<T>> {
    const run = this.queue.then(() =>
      attempt(async () => {
      const file = await this.read();
        const result = change(file.tasks);
        await writeJsonFile(this.fs, this.path, file);
        return result;
      }),
    );
    this.queue = run;
    return run;
  }

  private async read(): Promise<TasksFile> {
    const file = await readJsonFile<TasksFile>(this.fs, this.path, { schema_version: 1, tasks: [] });
    return { schema_version: 1, tasks: Array.isArray(file.tasks) ? file.tasks : [] };
  }
}

function find(tasks: Task[], id: string): Task {
  const task = tasks.find((t) => t.id === id);
  if (!task) throw new Error('That task no longer exists');
  return task;
}

function validate(input: TaskInput): string | null {
  if (!input.text?.trim()) return 'Write what the task is';
  if (input.text.trim().length > 300) return 'Keep the task under 300 characters';
  if (input.dueDate !== undefined && !isEntryDate(input.dueDate)) return 'That due date is not a real date';
  if (input.recurring && !input.dueDate) return 'A repeating task needs a start date';
  return null;
}

function optional(input: TaskInput): Partial<Task> {
  return { ...(input.dueDate ? { dueDate: input.dueDate } : {}), ...(input.recurring ? { recurring: input.recurring } : {}) };
}

async function attempt<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    return err((e as Error).message);
  }
}
