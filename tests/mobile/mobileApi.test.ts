// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CapacitorVaultFs } from '../../src/mobile-main/CapacitorVaultFs';
import { createMobileApi } from '../../src/mobile-main/mobileApi';
import type { Entry } from '../../src/shared/types/Entry';
import { Directory, Encoding, Filesystem, fakeFileText, resetFakeFilesystem } from './fakeFilesystem';

vi.mock('@capacitor/filesystem', () => import('./fakeFilesystem'));

const entry = (date: string, title: string, body: string): Entry => ({ schema_version: 1, date, title, tags: ['morning'], visibility: 'private', mood: 'good', body });

beforeEach(() => {
  resetFakeFilesystem();
  localStorage.clear();
});

describe('the phone app’s window.paroh', () => {
  it('writes the same Markdown vault as the desktop, in Documents/Paroh, and finds it again', async () => {
    const api = await createMobileApi(new CapacitorVaultFs(), '0.1.0');
    expect(api.platform).toBe('mobile');
    expect((await api.vault.info()).path).toBe('Documents/Paroh');

    const saved = await api.entries.save(entry('2026-10-02', 'A quiet morning', 'Tea on the balcony. [[2026-10-01]]'));
    expect(saved.ok).toBe(true);
    const file = fakeFileText('Paroh/2026-10/2026-10-02.md');
    expect(file).toMatch(/^---\n[\s\S]*title: A quiet morning[\s\S]*---\n/);
    expect(file).toContain('Tea on the balcony.');

    const listed = await api.entries.list();
    expect(listed.ok && listed.value.map((e) => e.title)).toEqual(['A quiet morning']);
    const found = await api.search.query('balc');
    expect(found.ok && found.value[0].date).toBe('2026-10-02');

    // A fresh start (the app was closed) rebuilds the in-memory index from the files.
    const again = await createMobileApi(new CapacitorVaultFs(), '0.1.0');
    const reloaded = await again.entries.load('2026-10-02');
    expect(reloaded.ok && reloaded.value?.title).toBe('A quiet morning');
    expect((await again.search.tags()).ok).toBe(true);
  });

  it('runs habits, tasks, horizons and recordings on the phone filesystem', async () => {
    const api = await createMobileApi(new CapacitorVaultFs(), '0.1.0');
    const habit = await api.habits.create({ name: 'Walk', frequency: 'daily' });
    expect(habit.ok).toBe(true);
    if (!habit.ok) return;
    expect((await api.habits.toggleToday(habit.value.id)).ok).toBe(true);
    expect((await api.tasks.create({ text: 'Call Mum' })).ok).toBe(true);
    const tasks = await api.tasks.list();
    expect(tasks.ok && tasks.value.map((t) => t.text)).toContain('Call Mum');
    expect((await api.horizons.addArea('Health')).ok).toBe(true);

    const begun = await api.audio.begin();
    expect(begun.ok).toBe(true);
    if (!begun.ok) return;
    await api.audio.append(begun.value.id, new Uint8Array([1, 2, 3]));
    await api.audio.append(begun.value.id, new Uint8Array([4, 5]));
    expect((await api.audio.finish(begun.value.id, 5)).ok).toBe(true);
    const bytes = await api.audio.read(begun.value.id);
    expect(bytes.ok && [...bytes.value]).toEqual([1, 2, 3, 4, 5]);
  });

  it('says plainly which features are desktop-only', async () => {
    const api = await createMobileApi(new CapacitorVaultFs(), '0.1.0');
    for (const r of [await api.vault.export(), await api.ai.setApiKey('sk-ant-x'), await api.settings.setReminder('21:00'), await api.audio.setTranscript('a', 'hello')]) {
      expect(r).toEqual({ ok: false, error: 'This is in the desktop app for now.' });
    }
    expect(await api.vault.choose()).toBeNull();
  });

  it('remembers onboarding', async () => {
    const api = await createMobileApi(new CapacitorVaultFs(), '0.1.0');
    expect((await api.settings.get()).onboarded).toBe(false);
    await api.settings.completeOnboarding();
    expect((await api.settings.get()).onboarded).toBe(true);
  });

  it('picks up files a sync app changed while Paroh was in the background', async () => {
    const api = await createMobileApi(new CapacitorVaultFs(), '0.1.0');
    const changes: string[][] = [];
    api.vault.onChanged((c) => changes.push(c.dates));
    await Filesystem.writeFile({
      path: 'Paroh/2026-10/2026-10-03.md',
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
      data: '---\nschema_version: 1\ndate: 2026-10-03\ntitle: Written on the laptop\ntags: []\nvisibility: private\n---\n\nSynced over.\n',
    });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(changes).toEqual([['2026-10-03']]));
    const listed = await api.entries.list();
    expect(listed.ok && listed.value.map((e) => e.title)).toEqual(['Written on the laptop']);
  });
});
