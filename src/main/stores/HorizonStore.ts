import { mkdir, readdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { toEntryDate } from '../../shared/localDate';
import { isEntryDate } from '../../shared/types/Entry';
import { DEFAULT_LIFE_AREAS, isPeriod, isSlug, isStoryStatus, slugify, type HorizonsData, type LifeStory, type LifeStoryInput } from '../../shared/types/LifeStory';
import { err, ok, type Result } from '../../shared/types/Result';
import { atomicWrite } from '../vault/atomicWrite';
import { parseLifeStory, serializeLifeStory } from '../vault/lifeStoryFile';

/** Life Stories as Markdown files under `<vault>/horizons/<area>/`, with the same atomic saves as entries. */
export class HorizonStore {
  private readonly dir: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(root: string) {
    this.dir = join(root, 'horizons');
  }

  async list(): Promise<Result<HorizonsData>> {
    try {
      const folders = await this.folders();
      const stories: LifeStory[] = [];
      for (const area of folders) {
        for (const file of await readdir(join(this.dir, area))) {
          const slug = file.replace(/\.md$/, '');
          if (!file.endsWith('.md') || !isSlug(slug)) continue;
          const path = join(this.dir, area, file);
          const parsed = parseLifeStory(await readFile(path, 'utf8'), `${area}/${slug}`, area, toEntryDate((await stat(path)).birthtime));
          // One unreadable story must not hide the others.
          if (parsed.ok) stories.push(parsed.value);
        }
      }
      stories.sort((a, b) => a.created.localeCompare(b.created) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
      const extraAreas = folders.filter((f) => !DEFAULT_LIFE_AREAS.includes(f)).sort();
      return ok({ areas: [...DEFAULT_LIFE_AREAS, ...extraAreas], stories });
    } catch (e) {
      return err(`Could not read Horizons: ${(e as Error).message}`);
    }
  }

  /** Creates a story, or updates the one at `id`. Changing the life area moves the file to that area's folder. */
  save(input: LifeStoryInput, id?: string): Promise<Result<LifeStory>> {
    const problem = validate(input);
    if (problem) return Promise.resolve(err(problem));
    if (id !== undefined && !isStoryId(id)) return Promise.resolve(err('Unknown story'));
    return this.serial(async () => {
      try {
        let extra: Record<string, unknown> | undefined;
        let slug: string;
        if (id) {
          const [oldArea, oldSlug] = id.split('/');
          const oldPath = join(this.dir, oldArea, `${oldSlug}.md`);
          const existing = parseLifeStory(await readFile(oldPath, 'utf8'), id, oldArea, input.created);
          if (existing.ok) extra = existing.value.extra;
          slug = oldArea === input.life_area ? oldSlug : await this.uniqueSlug(input.life_area, oldSlug);
          await mkdir(join(this.dir, input.life_area), { recursive: true });
          if (oldArea !== input.life_area) await rename(oldPath, join(this.dir, input.life_area, `${slug}.md`));
        } else {
          await mkdir(join(this.dir, input.life_area), { recursive: true });
          slug = await this.uniqueSlug(input.life_area, slugify(input.title));
        }
        const story: LifeStory = {
          id: `${input.life_area}/${slug}`,
          schema_version: 1,
          title: input.title.trim(),
          life_area: input.life_area,
          status: input.status,
          created: input.created,
          ...(input.when ? { when: input.when } : {}),
          linked_entries: [...new Set(input.linked_entries)].sort(),
          why: input.why.trim(),
          ...(extra ? { extra } : {}),
        };
        const text = serializeLifeStory(story);
        await atomicWrite(join(this.dir, input.life_area, `${slug}.md`), text, (written) => {
          const back = parseLifeStory(written, story.id, story.life_area, story.created);
          return back.ok && back.value.title === story.title && back.value.why === story.why ? null : 'Story did not round-trip';
        });
        return ok(story);
      } catch (e) {
        return err(`Could not save story: ${(e as Error).message}`);
      }
    });
  }

  remove(id: string): Promise<Result<void>> {
    if (!isStoryId(id)) return Promise.resolve(err('Unknown story'));
    const [area, slug] = id.split('/');
    return this.serial(async () => {
      try {
        await rm(join(this.dir, area, `${slug}.md`), { force: true });
        return ok(undefined);
      } catch (e) {
        return err(`Could not delete story: ${(e as Error).message}`);
      }
    });
  }

  /** A life area is just a folder, so adding one creates it (an empty area still shows as a row). */
  async addArea(name: string): Promise<Result<string>> {
    const area = slugify(String(name ?? ''));
    if (!String(name ?? '').trim() || area === 'story') return err('Give the life area a name');
    try {
      await mkdir(join(this.dir, area), { recursive: true });
      return ok(area);
    } catch (e) {
      return err(`Could not add life area: ${(e as Error).message}`);
    }
  }

  private serial<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
    const run = this.queue.then(fn);
    this.queue = run;
    return run;
  }

  private async folders(): Promise<string[]> {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw e;
    }
    const out: string[] = [];
    for (const n of names) if (isSlug(n) && (await stat(join(this.dir, n))).isDirectory()) out.push(n);
    return out;
  }

  private async uniqueSlug(area: string, base: string): Promise<string> {
    let existing: string[] = [];
    try {
      existing = await readdir(join(this.dir, area));
    } catch {
      // A new area has no files yet.
    }
    let slug = base;
    for (let n = 2; existing.includes(`${slug}.md`); n++) slug = `${base}-${n}`;
    return slug;
  }
}

function isStoryId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const parts = id.split('/');
  return parts.length === 2 && isSlug(parts[0]) && isSlug(parts[1]);
}

function validate(input: LifeStoryInput): string | null {
  if (typeof input?.title !== 'string' || !input.title.trim()) return 'Give the story a title';
  if (input.title.length > 200) return 'Keep the title under 200 characters';
  if (!isSlug(input.life_area)) return 'Pick a life area';
  if (!isStoryStatus(input.status)) return 'Pick a status';
  if (!isEntryDate(input.created)) return 'The start date is not a valid date';
  if (input.when !== undefined && input.when !== '' && !isPeriod(input.when)) return 'The "when" must be a year or a quarter';
  if (!Array.isArray(input.linked_entries) || !input.linked_entries.every(isEntryDate)) return 'Linked entries must be entry dates';
  if (typeof input.why !== 'string') return 'The why must be text';
  return null;
}
