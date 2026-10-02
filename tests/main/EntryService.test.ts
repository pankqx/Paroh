import { mkdtemp, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EntryService } from '../../src/main/EntryService';
import { emptyEntry } from '../../src/shared/types/Entry';

let root: string;
let service: EntryService;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paroh-service-'));
  service = await EntryService.open(root);
});
afterEach(async () => {
  service.close();
  await rm(root, { recursive: true, force: true });
});

const titles = () => (service.list().ok ? (service.list() as { value: { title: string }[] }).value.map((e) => e.title) : null);

describe('EntryService', () => {
  it('indexes what it saves and forgets what it deletes', async () => {
    await service.save({ ...emptyEntry('2026-06-11'), title: 'Morning', body: 'pigeons' });
    expect(service.search('pigeons').ok && (service.search('pigeons') as { value: unknown[] }).value).toHaveLength(1);
    await service.delete('2026-06-11');
    expect(titles()).toEqual([]);
  });

  it('picks up files added, edited or removed while the app was closed', async () => {
    await service.save({ ...emptyEntry('2026-06-11'), title: 'Before' });
    service.close();

    await writeFile(join(root, '2026-06', '2026-06-11.md'), '---\ntitle: After\n---\nedited elsewhere\n');
    await writeFile(join(root, '2026-06', '2026-06-12.md'), 'No frontmatter at all\n');
    service = await EntryService.open(root);
    expect(titles()).toEqual(['', 'After']);

    service.close();
    await unlink(join(root, '2026-06', '2026-06-12.md'));
    service = await EntryService.open(root);
    expect(titles()).toEqual(['After']);
  });

  it('treats its own saves as known and outside edits as changes', async () => {
    await service.save({ ...emptyEntry('2026-06-11'), title: 'Mine' });
    expect(await service.handleExternalChange('2026-06-11')).toBe(false);

    await new Promise((r) => setTimeout(r, 20));
    await writeFile(join(root, '2026-06', '2026-06-11.md'), '---\ntitle: Theirs\n---\n');
    expect(await service.handleExternalChange('2026-06-11')).toBe(true);
    expect(titles()).toEqual(['Theirs']);

    await unlink(join(root, '2026-06', '2026-06-11.md'));
    expect(await service.handleExternalChange('2026-06-11')).toBe(true);
    expect(titles()).toEqual([]);
  });

  it('rebuilds the index from the files on request', async () => {
    await service.save({ ...emptyEntry('2026-06-11'), title: 'One' });
    expect((await service.rebuildIndex()).ok).toBe(true);
    expect(titles()).toEqual(['One']);
  });
});
