import { joinPath, type VaultFs } from '../../shared/fs/VaultFs';
import type { Board, BoardItem, BoardSummary } from '../../shared/types/Board';
import { err, ok, type Result } from '../../shared/types/Result';
import { readJsonFile, writeJsonFile } from '../vault/jsonFile';

const DIR = 'boards';
const ID_RE = /^[a-z0-9-]{1,80}$/;
const TYPES = new Set<BoardItem['type']>(['sticky', 'text', 'shape', 'draw', 'arrow', 'image', 'checklist', 'frame']);
/** A board is a working surface, not an archive; the cap keeps one runaway paste from making a 100 MB file. */
const MAX_ITEMS = 5000;

/** Boards are plain JSON beside the entries, so they sync and export with the rest of the vault. */
export class BoardStore {
  constructor(
    private fs: VaultFs,
    private now: () => Date = () => new Date(),
  ) {}

  async list(): Promise<Result<BoardSummary[]>> {
    return attempt(async () => {
      let names: string[] = [];
      try {
        names = await this.fs.list(DIR);
      } catch {
        return [];
      }
      const boards: BoardSummary[] = [];
      for (const name of names.filter((n) => n.endsWith('.json'))) {
        const id = name.slice(0, -5);
        if (!ID_RE.test(id)) continue;
        try {
          boards.push(summarize(await this.read(id)));
        } catch {
          // One unreadable board shouldn't hide the others; opening it reports the problem.
        }
      }
      return boards.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
  }

  load(id: string): Promise<Result<Board>> {
    if (!ID_RE.test(id)) return Promise.resolve(err('That board does not exist'));
    return attempt(() => this.read(id));
  }

  async create(title: string): Promise<Result<Board>> {
    const clean = title.trim() || 'Untitled board';
    if (clean.length > 120) return err('Keep the name under 120 characters');
    return attempt(async () => {
      const id = await this.uniqueId(clean);
      const at = this.now().toISOString();
      const board: Board = { schema_version: 1, id, title: clean, createdAt: at, updatedAt: at, paper: 'dots', items: [] };
      await writeJsonFile(this.fs, this.path(id), board);
      return board;
    });
  }

  async save(board: Board): Promise<Result<Board>> {
    const problem = validate(board);
    if (problem) return err(problem);
    return attempt(async () => {
      const next: Board = { ...board, schema_version: 1, title: board.title.trim() || 'Untitled board', updatedAt: this.now().toISOString() };
      await writeJsonFile(this.fs, this.path(board.id), next);
      return next;
    });
  }

  remove(id: string): Promise<Result<void>> {
    if (!ID_RE.test(id)) return Promise.resolve(err('That board does not exist'));
    return attempt(() => this.fs.remove(this.path(id)));
  }

  private path(id: string) {
    return joinPath(DIR, `${id}.json`);
  }

  private async read(id: string): Promise<Board> {
    const board = await readJsonFile<Board | null>(this.fs, this.path(id), null);
    if (!board || !Array.isArray(board.items)) throw new Error('That board does not exist');
    return { ...board, id, items: board.items.filter((i) => i && TYPES.has(i.type)) };
  }

  private async uniqueId(title: string): Promise<string> {
    const base =
      title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'board';
    let existing: string[] = [];
    try {
      existing = await this.fs.list(DIR);
    } catch {
      existing = [];
    }
    let id = base;
    for (let n = 2; existing.includes(`${id}.json`); n++) id = `${base}-${n}`;
    return id;
  }
}

function validate(board: Board): string | null {
  if (!board || !ID_RE.test(board.id)) return 'That board does not exist';
  if (!Array.isArray(board.items)) return 'The board is missing its items';
  if (board.items.length > MAX_ITEMS) return `A board holds up to ${MAX_ITEMS} items`;
  for (const item of board.items) {
    if (!item || !TYPES.has(item.type) || typeof item.id !== 'string') return 'The board has an item Paroh does not understand';
    if (![item.x, item.y, item.w, item.h].every(Number.isFinite)) return 'The board has an item with no position';
    if (item.type === 'image' && (typeof item.src !== 'string' || !item.src.startsWith('media/'))) return 'Board pictures must live in the journal folder';
  }
  return null;
}

function summarize(board: Board): BoardSummary {
  return {
    id: board.id,
    title: board.title,
    updatedAt: board.updatedAt,
    itemCount: board.items.length,
    preview: board.items.slice(0, 60).map((i) => ({ type: i.type, x: i.x, y: i.y, w: i.w, h: i.h, color: 'color' in i ? i.color : 'fill' in i ? i.fill : undefined })),
  };
}

async function attempt<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    return err((e as Error).message);
  }
}
