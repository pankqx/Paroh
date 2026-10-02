import { join } from 'node:path';
import type { HabitInput } from '../../shared/ipc-contract';
import { toEntryDate } from '../../shared/localDate';
import { emptyEntry } from '../../shared/types/Entry';
import type { Habit } from '../../shared/types/Habit';
import { err, ok, type Result } from '../../shared/types/Result';
import type { EntryService } from '../EntryService';
import { readJsonFile, writeJsonFile } from '../vault/jsonFile';

interface HabitsFile {
  schema_version: 1;
  habits: Habit[];
}


/** Habit definitions in `.paroh/habits.json`. Completions are written to each day's entry frontmatter, never here. */
export class HabitStore {
  private readonly path: string;

  constructor(
    private entries: EntryService,
    private today: () => string = () => toEntryDate(new Date()),
  ) {
    this.path = join(entries.root, '.paroh', 'habits.json');
  }

  async list(): Promise<Result<Habit[]>> {
    return attempt(async () => (await this.read()).habits);
  }

  private queue: Promise<unknown> = Promise.resolve();

  /** One write at a time, so quick clicks can't overwrite each other's read-modify-write. */
  private serial<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
    const run = this.queue.then(fn);
    this.queue = run;
    return run;
  }

  async create(input: HabitInput): Promise<Result<Habit>> {
    const problem = validate(input);
    if (problem) return err(problem);
    return this.serial(() => attempt(async () => {
      const file = await this.read();
      const habit: Habit = { id: uniqueId(input.name, file.habits), name: input.name.trim(), ...frequencyOf(input), createdAt: this.today(), archived: false };
      file.habits.push(habit);
      await writeJsonFile(this.path, file);
      return habit;
    }));
  }

  async update(id: string, input: HabitInput): Promise<Result<Habit>> {
    const problem = validate(input);
    if (problem) return err(problem);
    return this.modify(id, (h) => ({ ...h, name: input.name.trim(), ...frequencyOf(input) }));
  }

  /** Never deletes: past entries keep their history and the heatmap stays intact (§6 edge cases). */
  setArchived(id: string, archived: boolean): Promise<Result<Habit>> {
    return this.modify(id, (h) => ({ ...h, archived }));
  }

  /** Only today can be toggled; past days are an honest, read-only record (§6 Interactions). */
  toggleToday(id: string): Promise<Result<string[]>> {
    return this.serial(() => this.toggle(id));
  }

  private async toggle(id: string): Promise<Result<string[]>> {
    const date = this.today();
    const habits = await this.list();
    if (!habits.ok) return habits;
    const habit = habits.value.find((h) => h.id === id);
    if (!habit || habit.archived) return err('That habit is archived or no longer exists');
    const loaded = await this.entries.load(date);
    if (!loaded.ok) return loaded;
    const entry = loaded.value ?? emptyEntry(date);
    const done = new Set(entry.habits_snapshot ?? []);
    if (done.has(id)) done.delete(id);
    else done.add(id);
    const snapshot = [...done];
    const saved = await this.entries.save({ ...entry, habits_snapshot: snapshot });
    return saved.ok ? ok(snapshot) : saved;
  }

  private modify(id: string, change: (h: Habit) => Habit): Promise<Result<Habit>> {
    return this.serial(() => attempt(async () => {
      const file = await this.read();
      const i = file.habits.findIndex((h) => h.id === id);
      if (i < 0) throw new Error('That habit no longer exists');
      file.habits[i] = change(file.habits[i]);
      await writeJsonFile(this.path, file);
      return file.habits[i];
    }));
  }

  private async read(): Promise<HabitsFile> {
    const file = await readJsonFile<HabitsFile>(this.path, { schema_version: 1, habits: [] });
    return { schema_version: 1, habits: Array.isArray(file.habits) ? file.habits : [] };
  }
}

function validate(input: HabitInput): string | null {
  if (!input.name?.trim()) return 'Give the habit a name';
  if (input.name.trim().length > 80) return 'Keep the name under 80 characters';
  if (input.frequency === 'custom' && !input.customDays?.length) return 'Pick at least one day';
  return null;
}

function frequencyOf(input: HabitInput): Pick<Habit, 'frequency' | 'customDays'> {
  if (input.frequency !== 'custom') return { frequency: input.frequency, customDays: undefined };
  const days = [...new Set(input.customDays ?? [])].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
  return { frequency: 'custom', customDays: days };
}

/** Readable ids (`morning-pages`) because they appear in entry frontmatter. */
function uniqueId(name: string, existing: Habit[]): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'habit';
  const taken = new Set(existing.map((h) => h.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

async function attempt<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    return err((e as Error).message);
  }
}
