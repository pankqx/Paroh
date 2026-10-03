import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EntryService } from '../../../src/main/EntryService';
import { AudioStore } from '../../../src/main/stores/AudioStore';
import { HabitStore } from '../../../src/main/stores/HabitStore';
import { TaskStore } from '../../../src/main/stores/TaskStore';
import type { Result } from '../../../src/shared/types/Result';

let root: string;
let service: EntryService;
let today = '2026-10-02';

const value = <T>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paroh-stores-'));
  service = await EntryService.open(root);
  today = '2026-10-02';
});
afterEach(async () => {
  service.close();
  await rm(root, { recursive: true, force: true });
});

describe('HabitStore', () => {
  const store = () => new HabitStore(service, () => today);

  it('creates habits with readable, unique ids', async () => {
    const a = value(await store().create({ name: 'Morning pages', frequency: 'daily' }));
    const b = value(await store().create({ name: 'Morning pages', frequency: 'weekdays' }));
    expect([a.id, b.id]).toEqual(['morning-pages', 'morning-pages-2']);
    expect(JSON.parse(await readFile(join(root, '.paroh', 'habits.json'), 'utf8')).habits).toHaveLength(2);
  });

  it('records today’s completion in today’s entry frontmatter, and toggles back off', async () => {
    const h = value(await store().create({ name: 'Walk outside', frequency: 'daily' }));
    expect(value(await store().toggleToday(h.id))).toEqual(['walk-outside']);
    expect(await readFile(join(root, '2026-10', '2026-10-02.md'), 'utf8')).toContain('habits_snapshot: [walk-outside]');
    expect(value(service.habitHistory())).toEqual([{ date: '2026-10-02', habits: ['walk-outside'] }]);
    expect(value(await store().toggleToday(h.id))).toEqual([]);
    expect(value(service.habitHistory())).toEqual([]);
  });

  it('never touches past entries: only today is toggled, and archiving keeps history', async () => {
    const h = value(await store().create({ name: 'Walk', frequency: 'daily' }));
    await store().toggleToday(h.id);
    today = '2026-10-03';
    await store().toggleToday(h.id);
    value(await store().setArchived(h.id, true));
    expect(value(service.habitHistory()).map((d) => d.date)).toEqual(['2026-10-02', '2026-10-03']);
    expect((await store().toggleToday(h.id)).ok).toBe(false);
  });

  it('handles quick repeated toggles without losing one', async () => {
    const s = store();
    const a = value(await s.create({ name: 'A', frequency: 'daily' }));
    const b = value(await s.create({ name: 'B', frequency: 'daily' }));
    await Promise.all([s.toggleToday(a.id), s.toggleToday(b.id)]);
    expect(value(service.habitHistory())[0].habits.sort()).toEqual(['a', 'b']);
  });

  it('rejects a custom schedule with no days', async () => {
    expect((await store().create({ name: 'X', frequency: 'custom', customDays: [] })).ok).toBe(false);
  });

  it('refuses to overwrite a habits file it cannot read', async () => {
    await service.save({ schema_version: 1, date: today, title: '', tags: [], visibility: 'private', body: '' });
    await writeFile(join(root, '.paroh', 'habits.json'), '{ not json');
    expect((await store().create({ name: 'Y', frequency: 'daily' })).ok).toBe(false);
    expect(await readFile(join(root, '.paroh', 'habits.json'), 'utf8')).toBe('{ not json');
  });
});

describe('TaskStore', () => {
  const store = () => new TaskStore(service.fs, () => today);

  it('creates, completes and reopens a task', async () => {
    const t = value(await store().create({ text: 'Call mom', dueDate: today }));
    expect(value(await store().toggle(t.id))).toMatchObject({ done: true, doneDate: today });
    expect(value(await store().toggle(t.id))).toMatchObject({ done: false });
    expect(value(await store().list())[0].doneDate).toBeUndefined();
  });

  it('schedules the next instance of a recurring task, across a month boundary', async () => {
    today = '2026-10-31';
    const t = value(await store().create({ text: 'Water plants', dueDate: today, recurring: 'daily' }));
    await store().toggle(t.id);
    const open = value(await store().list()).filter((x) => !x.done);
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ text: 'Water plants', dueDate: '2026-11-01', recurring: 'daily' });
  });

  it('skips the weekend for weekday tasks', async () => {
    const t = value(await store().create({ text: 'Standup', dueDate: today, recurring: 'weekdays' })); // Friday
    await store().toggle(t.id);
    expect(value(await store().list()).find((x) => !x.done)?.dueDate).toBe('2026-10-05');
  });

  it('resolves a nudge by moving to today and keeping where it came from', async () => {
    today = '2026-09-30';
    const t = value(await store().create({ text: 'Finish chapter', dueDate: today }));
    today = '2026-10-02';
    const moved = value(await store().resolveNudge(t.id, 'reflect', '  Too tired  '));
    expect(moved).toMatchObject({ dueDate: '2026-10-02', carriedOverFrom: '2026-09-30', stallReflection: 'Too tired' });
    today = '2026-10-04';
    expect(value(await store().resolveNudge(t.id, 'moveToday')).carriedOverFrom).toBe('2026-09-30');
  });

  it('requires a start date for repeating tasks and real dates', async () => {
    expect((await store().create({ text: 'x', recurring: 'daily' })).ok).toBe(false);
    expect((await store().create({ text: 'x', dueDate: '2026-02-31' })).ok).toBe(false);
    expect((await store().create({ text: '   ' })).ok).toBe(false);
  });

  it('keeps an explanation, priority and comments, and carries them to the next repeat', async () => {
    const t = value(await store().create({ text: 'Plan trip', dueDate: today, recurring: 'weekly', notes: '  Book trains first ', priority: 'high' }));
    expect(t).toMatchObject({ notes: 'Book trains first', priority: 'high' });
    const commented = value(await store().comment(t.id, ' Asked Sam about dates '));
    expect(commented.comments).toHaveLength(1);
    expect(commented.comments?.[0].text).toBe('Asked Sam about dates');
    expect((await store().comment(t.id, '  ')).ok).toBe(false);
    expect(value(await store().uncomment(t.id, commented.comments![0].id)).comments).toBeUndefined();
    const cleared = value(await store().update(t.id, { text: 'Plan trip', dueDate: today, recurring: 'weekly' }));
    expect(cleared.notes).toBeUndefined();
    value(await store().update(t.id, { text: 'Plan trip', dueDate: today, recurring: 'weekly', notes: 'Trains', priority: 'low' }));
    await store().toggle(t.id);
    expect(value(await store().list()).find((x) => !x.done)).toMatchObject({ notes: 'Trains', priority: 'low' });
    expect((await store().create({ text: 'x', priority: 'urgent' as never })).ok).toBe(false);
  });

  it('removes a task', async () => {
    const t = value(await store().create({ text: 'Delete me' }));
    value(await store().remove(t.id));
    expect(value(await store().list())).toEqual([]);
  });
});

describe('AudioStore', () => {
  const at = new Date(2026, 9, 2, 9, 5, 7);
  const store = () => new AudioStore(service, () => at);

  it('streams chunks to disk, stores duration and links the recording into that day’s entry', async () => {
    const s = store();
    const { id } = value(await s.begin());
    expect(id).toBe('2026-10-02-090507');
    await s.append(id, new Uint8Array([1, 2]));
    await s.append(id, new Uint8Array([3]));
    const log = value(await s.finish(id, 64.6));
    expect(log).toMatchObject({ filePath: 'audio/2026-10-02-090507.webm', durationSeconds: 65, linkedEntryDate: '2026-10-02' });
    expect([...value(await s.read(id))]).toEqual([1, 2, 3]);
    expect(value(await service.load('2026-10-02'))?.audio).toEqual(['audio/2026-10-02-090507.webm']);
  });

  it('lists a recording that was cut off before it finished', async () => {
    const s = store();
    const { id } = value(await s.begin());
    await s.append(id, new Uint8Array([9, 9]));
    const fresh = store(); // app restarted mid-recording
    const listed = value(await fresh.list());
    expect(listed).toEqual([expect.objectContaining({ id, title: 'Interrupted recording' })]);
    expect(listed[0].durationSeconds).toBeUndefined();
  });

  it('gives two recordings in the same second different files', async () => {
    const s = store();
    const a = value(await s.begin());
    const b = value(await s.begin());
    expect(a.id).not.toBe(b.id);
  });

  it('refuses ids that could escape the audio folder', async () => {
    expect((await store().read('../../etc/passwd')).ok).toBe(false);
    expect((await store().setTranscript('../../etc/passwd', 'x')).ok).toBe(false);
  });

  it('keeps a transcript with the recording, makes it searchable, and removes it on request', async () => {
    const s = store();
    const { id } = value(await s.begin());
    await s.append(id, new Uint8Array([1]));
    await s.finish(id, 3);
    const log = value(await s.setTranscript(id, '  Walked to the lighthouse with Priya.  '));
    expect(log).toMatchObject({ transcript: 'Walked to the lighthouse with Priya.', transcribedAt: at.toISOString() });
    expect(value(await s.list())[0].transcript).toBe('Walked to the lighthouse with Priya.');
    expect(value(await service.load('2026-10-02'))?.body ?? '').not.toContain('lighthouse'); // the entry itself is never touched
    const hits = value(await service.search('lighthouse'));
    expect(hits.map((h) => h.date)).toEqual(['2026-10-02']);
    expect(hits[0].snippet).toContain('lighthouse');

    value(await s.setTranscript(id, ''));
    expect(value(await s.list())[0].transcript).toBeUndefined();
    expect(value(await service.search('lighthouse'))).toEqual([]);
  });

  it('re-indexes transcripts from audio.json when a vault opens', async () => {
    const s = store();
    const { id } = value(await s.begin());
    await s.finish(id, 3);
    value(await s.setTranscript(id, 'notes about the harbour'));
    service.close();
    await rm(join(root, '.paroh', 'index.db'), { force: true });
    service = await EntryService.open(root);
    expect(value(await service.search('harbour'))).toEqual([]);
    await new AudioStore(service, () => at).syncTranscriptIndex();
    expect(value(await service.search('harbour')).map((h) => h.date)).toEqual(['2026-10-02']);
  });
});
