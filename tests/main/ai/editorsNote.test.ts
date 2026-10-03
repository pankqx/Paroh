import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MonthDigest, NarrativeProvider } from '../../../src/main/ai/AIProvider';
import { EditorsNoteService } from '../../../src/main/ai/EditorsNoteService';
import { buildMonthDigest } from '../../../src/main/ai/monthDigest';
import { EDITORS_NOTE_SYSTEM, editorsNoteUserMessage } from '../../../src/main/ai/editorsNotePrompt';
import { parseEditorsNote, serializeEditorsNote } from '../../../src/main/vault/editorsNoteFile';
import type { Entry } from '../../../src/shared/types/Entry';
import { ok, type Result } from '../../../src/shared/types/Result';

const entry = (date: string, body: string, extra: Partial<Entry> = {}): Entry => ({ schema_version: 1, date, title: '', tags: [], visibility: 'private', body, ...extra });
const october = [
  entry('2026-10-03', 'Rain all day. **Finished** the book.', { mood: 'ok', tags: ['reading'], title: 'Rain' }),
  entry('2026-10-01', 'Walked with Priya to the lighthouse.', { mood: 'good' }),
  entry('2026-10-02', ''),
  entry('2026-09-30', 'September leftovers'),
];

const value = <T>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

describe('month digest and prompt', () => {
  it('sends only that month’s written days, oldest first, as plain text with mood and tags', () => {
    const d = buildMonthDigest('2026-10', october);
    expect(d.entries).toEqual([
      { date: '2026-10-01', title: '', mood: 'good', tags: [], text: 'Walked with Priya to the lighthouse.' },
      { date: '2026-10-03', title: 'Rain', mood: 'ok', tags: ['reading'], text: 'Rain all day. Finished the book.' },
    ]);
  });

  it('puts each day in its own tagged block and keeps the system prompt free of per-request values', () => {
    const msg = editorsNoteUserMessage(buildMonthDigest('2026-10', october));
    expect(msg).toContain('<entry date="2026-10-03" mood="ok" tags="reading">\nTitle: Rain\nRain all day. Finished the book.\n</entry>');
    expect(msg).toContain('October 2026 (2 days)');
    expect(msg).not.toContain('September leftovers');
    expect(EDITORS_NOTE_SYSTEM).not.toMatch(/\d{4}-\d{2}/);
  });
});

describe('Editor’s Note file', () => {
  it('round-trips through plain Markdown with frontmatter', () => {
    const note = { month: '2026-10', text: 'October began quietly.\n\nThen it rained.', createdAt: '2026-10-31T20:00:00.000Z', model: 'claude-opus-5-5' };
    const text = serializeEditorsNote(note);
    expect(text).toMatch(/^---\nschema_version: 1\nmonth: 2026-10\nkind: editors-note\n/);
    expect(value(parseEditorsNote(text, '2026-10'))).toEqual(note);
  });
});

describe('EditorsNoteService', () => {
  let root: string;
  let enabled: boolean;
  let provider: NarrativeProvider | null;
  const seen: MonthDigest[] = [];

  const service = () =>
    new EditorsNoteService({
      vaultRoot: () => root,
      loadMonth: async () => ok(october),
      enabled: async () => enabled,
      provider: async () => provider,
      now: () => new Date('2026-10-31T20:00:00Z'),
    });

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'paroh-note-'));
    enabled = true;
    seen.length = 0;
    provider = {
      model: 'claude-opus-5-5',
      editorsNote: vi.fn(async (d: MonthDigest) => {
        seen.push(d);
        return ok('October began quietly.');
      }),
    };
  });
  afterEach(() => rm(root, { recursive: true, force: true }));

  it('refuses while the switch is off, and never calls the provider', async () => {
    enabled = false;
    const r = await service().generate('2026-10');
    expect(r.ok).toBe(false);
    expect(provider?.editorsNote).not.toHaveBeenCalled();
  });

  it('asks for a key when none is stored', async () => {
    provider = null;
    expect(await service().generate('2026-10')).toEqual({ ok: false, error: 'Add your Anthropic API key in Settings first.' });
  });

  it('returns a draft without writing anything to the vault', async () => {
    const draft = value(await service().generate('2026-10'));
    expect(draft).toEqual({ month: '2026-10', text: 'October began quietly.', model: 'claude-opus-5-5', entryCount: 2 });
    expect(seen[0].entries.map((e) => e.date)).toEqual(['2026-10-01', '2026-10-03']);
    expect(await readdir(root)).toEqual([]);
  });

  it('saves a kept draft to chapters/YYYY-MM.md, loads it back, and removes it', async () => {
    const s = service();
    expect(value(await s.load('2026-10'))).toBeNull();
    const draft = value(await s.generate('2026-10'));
    const saved = value(await s.save(draft));
    expect(await readFile(join(root, 'chapters', '2026-10.md'), 'utf8')).toContain('October began quietly.');
    expect(value(await s.load('2026-10'))).toEqual(saved);
    value(await s.remove('2026-10'));
    expect(value(await s.load('2026-10'))).toBeNull();
  });

  it('rejects months that are not YYYY-MM, so nothing can be written outside chapters/', async () => {
    const s = service();
    for (const bad of ['../2026-10', '2026-13', '2026-10/../../x']) {
      expect((await s.generate(bad)).ok).toBe(false);
      expect((await s.save({ month: bad, text: 'x', model: '', entryCount: 0 })).ok).toBe(false);
      expect((await s.remove(bad)).ok).toBe(false);
    }
  });

  it('cancel() aborts the request in flight', async () => {
    let signal: AbortSignal | undefined;
    provider = {
      model: 'm',
      editorsNote: (_d, s) =>
        new Promise((resolve) => {
          signal = s;
          s?.addEventListener('abort', () => resolve({ ok: false, error: 'Stopped.' }));
        }),
    };
    const s = service();
    const pending = s.generate('2026-10');
    await vi.waitFor(() => expect(signal).toBeDefined());
    s.cancel();
    expect(await pending).toEqual({ ok: false, error: 'Stopped.' });
  });
});
