import type { VaultFs } from '../../shared/fs/VaultFs';
import { err, ok, type Result } from '../../shared/types/Result';
import { isEntryDate } from '../../shared/types/Entry';
import { PLAN_AREAS, type PlanEvent, type PlanEventInput, type PlanGoal, type PlanGoalInput, type PlannerData } from '../../shared/types/Planner';
import { readJsonFile, writeJsonFile } from '../vault/jsonFile';

interface PlannerFile extends PlannerData {
  schema_version: 1;
}

const PATH = '.paroh/planner.json';
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const PERIOD_RE = /^\d{4}(-(0[1-9]|1[0-2]))?$/;

/** Plans and goals for the monthly and yearly planners, in one small JSON file beside the tasks. */
export class PlannerStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private fs: VaultFs) {}

  list(): Promise<Result<PlannerData>> {
    return attempt(async () => {
      const { events, goals } = await this.read();
      return { events, goals };
    });
  }

  saveEvent(input: PlanEventInput, id?: string): Promise<Result<PlanEvent>> {
    const problem = validateEvent(input);
    if (problem) return Promise.resolve(err(problem));
    return this.write((file) => {
      const clean: PlanEvent = {
        id: id ?? crypto.randomUUID(),
        title: input.title.trim(),
        start: input.start,
        area: input.area,
        ...(input.end && input.end !== input.start ? { end: input.end } : {}),
        ...(input.time && (!input.end || input.end === input.start) ? { time: input.time } : {}),
        ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
        ...(input.milestone ? { milestone: true } : {}),
      };
      const at = id ? file.events.findIndex((e) => e.id === id) : -1;
      if (id && at === -1) throw new Error('That plan no longer exists');
      if (at >= 0) file.events[at] = clean;
      else file.events.push(clean);
      return clean;
    });
  }

  removeEvent(id: string): Promise<Result<void>> {
    return this.write((file) => {
      file.events = file.events.filter((e) => e.id !== id);
    });
  }

  saveGoal(input: PlanGoalInput, id?: string): Promise<Result<PlanGoal>> {
    if (!input.text?.trim()) return Promise.resolve(err('Write what the goal is'));
    if (input.text.trim().length > 200) return Promise.resolve(err('Keep a goal under 200 characters'));
    if (!PERIOD_RE.test(input.period)) return Promise.resolve(err('A goal belongs to a month or a year'));
    if (!PLAN_AREAS.includes(input.area)) return Promise.resolve(err('That area is not one Paroh knows'));
    return this.write((file) => {
      const clean: PlanGoal = { id: id ?? crypto.randomUUID(), period: input.period, text: input.text.trim(), area: input.area, progress: Math.max(0, Math.min(100, Math.round(Number(input.progress) || 0))) };
      const at = id ? file.goals.findIndex((g) => g.id === id) : -1;
      if (id && at === -1) throw new Error('That goal no longer exists');
      if (at >= 0) file.goals[at] = clean;
      else file.goals.push(clean);
      return clean;
    });
  }

  removeGoal(id: string): Promise<Result<void>> {
    return this.write((file) => {
      file.goals = file.goals.filter((g) => g.id !== id);
    });
  }

  /** Read-modify-write, one at a time. */
  private write<T>(change: (file: PlannerFile) => T): Promise<Result<T>> {
    const run = this.queue.then(() =>
      attempt(async () => {
        const file = await this.read();
        const result = change(file);
        await writeJsonFile(this.fs, PATH, file);
        return result;
      }),
    );
    this.queue = run;
    return run;
  }

  private async read(): Promise<PlannerFile> {
    const file = await readJsonFile<Partial<PlannerFile>>(this.fs, PATH, {});
    return { schema_version: 1, events: Array.isArray(file.events) ? file.events : [], goals: Array.isArray(file.goals) ? file.goals : [] };
  }
}

function validateEvent(input: PlanEventInput): string | null {
  if (!input.title?.trim()) return 'Give the plan a name';
  if (input.title.trim().length > 200) return 'Keep the name under 200 characters';
  if (!isEntryDate(input.start)) return 'That start date is not a real date';
  if (input.end !== undefined && input.end !== '' && !isEntryDate(input.end)) return 'That end date is not a real date';
  if (input.end && input.end < input.start) return 'A plan cannot end before it starts';
  if (input.time && !TIME_RE.test(input.time)) return 'Use a time like 09:30';
  if (!PLAN_AREAS.includes(input.area)) return 'That area is not one Paroh knows';
  if (input.notes && input.notes.length > 2000) return 'Keep the note under 2000 characters';
  return null;
}

async function attempt<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    return err((e as Error).message);
  }
}
