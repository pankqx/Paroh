import axe from 'axe-core';
import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import type { ParohApi } from '../../src/shared/ipc-contract';
import { CanvasPage } from '../../src/renderer/features/canvas/CanvasPage';
import { MetadataRail } from '../../src/renderer/features/editor/MetadataRail';
import { Sidebar } from '../../src/renderer/app/Sidebar';
import { AllEntriesPage } from '../../src/renderer/features/all-entries/AllEntriesPage';
import { CalendarPage } from '../../src/renderer/features/calendar/CalendarPage';
import type { EntrySummary } from '../../src/shared/types/Entry';
import type { Habit } from '../../src/shared/types/Habit';
import type { Task } from '../../src/shared/types/Task';
import { RecorderProvider } from '../../src/renderer/app/RecorderContext';
import { HabitsPage } from '../../src/renderer/features/habits/HabitsPage';
import { TodoPage } from '../../src/renderer/features/todo/TodoPage';
import { AudioLogsPage } from '../../src/renderer/features/audio-logs/AudioLogsPage';
import { ChaptersPage } from '../../src/renderer/features/chapters/ChaptersPage';
import { HorizonsPage } from '../../src/renderer/features/horizons/HorizonsPage';
import { LifeStoryEditor } from '../../src/renderer/features/horizons/LifeStoryEditor';
import type { LifeStory } from '../../src/shared/types/LifeStory';
import { SettingsPage } from '../../src/renderer/features/settings/SettingsPage';
import { OnboardingPage } from '../../src/renderer/features/onboarding/OnboardingPage';
import { HealingPromptsPage } from '../../src/renderer/features/healing/HealingPromptsPage';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const habits: Habit[] = [{ id: 'walk', name: 'Walk outside', frequency: 'daily', createdAt: '2026-09-01', archived: false }];
const tasks: Task[] = [
  { id: 't1', text: 'Call mom', createdDate: '2026-09-30', dueDate: '2026-09-30', done: false },
  { id: 't2', text: 'Finish chapter 3', createdDate: '2026-10-02', dueDate: '2026-10-02', done: false, recurring: 'daily' },
];
const story: LifeStory = { id: 'health/run-a-5k', schema_version: 1, title: 'Run a 5k', life_area: 'health', status: 'in-motion', created: '2026-06-01', when: '2027-Q2', linked_entries: ['2026-10-01'], why: 'To feel strong.' };
window.paroh = {
  entries: {
    save: async (e) => ({ ok: true, value: e }),
    load: async () => ({ ok: true, value: null }),
    delete: async () => ({ ok: true, value: undefined }),
    list: async () => ({ ok: true, value: [] }),
    backlinks: async () => ({ ok: true, value: [] }),
    resolveLink: async () => ({ ok: true, value: null }),
  },
  search: { query: async () => ({ ok: true, value: [] }), tags: async () => ({ ok: true, value: [] }), rebuildIndex: async () => ({ ok: true, value: undefined }) },
  habits: {
    list: async () => ({ ok: true, value: habits }),
    create: async () => ({ ok: true, value: habits[0] }),
    update: async () => ({ ok: true, value: habits[0] }),
    setArchived: async () => ({ ok: true, value: habits[0] }),
    toggleToday: async () => ({ ok: true, value: [] }),
    history: async () => ({ ok: true, value: [{ date: '2026-10-01', habits: ['walk'] }] }),
  },
  tasks: {
    list: async () => ({ ok: true, value: tasks }),
    create: async () => ({ ok: true, value: tasks[0] }),
    update: async () => ({ ok: true, value: tasks[0] }),
    toggle: async () => ({ ok: true, value: tasks[0] }),
    resolveNudge: async () => ({ ok: true, value: tasks[0] }),
    remove: async () => ({ ok: true, value: undefined }),
  },
  audio: {
    begin: async () => ({ ok: true, value: { id: 'x' } }),
    append: async () => ({ ok: true, value: undefined }),
    finish: async () => ({ ok: false, error: 'unused' }),
    list: async () => ({ ok: true, value: [{ id: '2026-10-01-090000', filePath: 'audio/2026-10-01-090000.webm', title: 'Morning', createdAt: '2026-10-01T09:00:00Z', durationSeconds: 65, linkedEntryDate: '2026-10-01' }] }),
    read: async () => ({ ok: true, value: new Uint8Array() }),
    rename: async () => ({ ok: true, value: undefined }),
  },
  prompts: { history: async () => ({ ok: true, value: [{ prompt_id: 'noticing-001', date: '2026-10-01', outcome: 'answered' }] }) },
  chapters: {
    month: async () => ({
      ok: true,
      value: [
        { schema_version: 1, date: '2026-10-01', title: 'A quiet morning', mood: 'ok', tags: [], visibility: 'private', body: 'Coffee and pigeons. Coffee again.' },
        { schema_version: 1, date: '2026-10-02', title: '', mood: 'good', tags: [], visibility: 'private', body: '' },
      ],
    }),
  },
  horizons: {
    list: async () => ({ ok: true, value: { areas: ['career', 'health'], stories: [story] } }),
    save: async () => ({ ok: true, value: story }),
    remove: async () => ({ ok: true, value: undefined }),
    addArea: async () => ({ ok: true, value: 'x' }),
  },
  settings: {
    get: async () => ({ vaultPath: '/home/me/Paroh', onboarded: true, aiFeatures: {}, reminderTime: '21:00', version: '0.1.0' }),
    setAiFeature: async () => ({ ok: true, value: undefined }),
    setReminder: async () => ({ ok: true, value: undefined }),
    completeOnboarding: async () => {},
  },
  vault: {
    info: async () => ({ path: '/home/me/Paroh' }),
    choose: async () => null,
    confirmChoice: async () => null,
    reveal: async () => '',
    export: async () => ({ ok: true, value: null }),
    import: async () => ({ ok: true, value: null }),
    onExportProgress: () => () => {},
    onChanged: () => () => {},
  },
} satisfies ParohApi;

const entries: EntrySummary[] = [
  { date: '2026-10-01', title: 'A quiet morning', mood: 'ok', tags: ['calm'], excerpt: 'Sample text' },
  { date: '2026-09-29', title: '', tags: [], excerpt: '' },
];

/** `hostTag` is `div` for screens that render their own `<main>` (onboarding). */
async function violations(ui: ReactElement, hostTag: 'main' | 'div' = 'main') {
  const host = document.createElement(hostTag);
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<RecorderProvider>{ui}</RecorderProvider>));
  await act(async () => {});
  // Colour contrast needs real layout, which jsdom does not have.
  const result = await axe.run(host, { rules: { 'color-contrast': { enabled: false } } });
  act(() => root.unmount());
  host.remove();
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('accessibility (axe-core)', () => {
  it('Canvas has no violations, with and without entries', async () => {
    const noop = () => {};
    expect(await violations(<CanvasPage today="2026-10-02" entries={entries} loadError={null} onOpenEntry={noop} onEntriesChanged={noop} onNavigate={noop} />)).toEqual([]);
    expect(await violations(<CanvasPage today="2026-10-02" entries={[]} loadError={null} onOpenEntry={noop} onEntriesChanged={noop} onNavigate={noop} />)).toEqual([]);
  });

  it('Sidebar has no violations', async () => {
    const noop = () => {};
    expect(await violations(<Sidebar view={{ name: 'canvas' }} today="2026-10-02" vaultPath="/home/me/Paroh" onNavigate={noop} onChooseVault={noop} />)).toEqual([]);
  });

  it('Calendar and All Entries pages have no violations', async () => {
    const noop = () => {};
    expect(await violations(<CalendarPage today="2026-10-02" entries={entries} onOpenEntry={noop} />)).toEqual([]);
    expect(await violations(<AllEntriesPage query="morning" onQuery={noop} onOpenEntry={noop} />)).toEqual([]);
  });

  it('Habits, To-Do and Audio Logs pages have no violations', async () => {
    const noop = () => {};
    expect(await violations(<HabitsPage today="2026-10-02" />)).toEqual([]);
    expect(await violations(<TodoPage today="2026-10-02" />)).toEqual([]);
    expect(await violations(<AudioLogsPage onOpenEntry={noop} />)).toEqual([]);
  });

  it('Healing Prompts page has no violations', async () => {
    const noop = () => {};
    expect(await violations(<HealingPromptsPage today="2026-10-02" entryDates={entries.map((e) => e.date)} onOpenEntry={noop} onChanged={noop} />)).toEqual([]);
  });

  it('Chapters page has no violations', async () => {
    const noop = () => {};
    expect(await violations(<ChaptersPage today="2026-10-02" onOpenEntry={noop} onOpenRange={noop} />)).toEqual([]);
  });

  it('Horizons timeline, list and story editor have no violations', async () => {
    const noop = () => {};
    expect(await violations(<HorizonsPage today="2026-10-02" entries={entries} onOpenEntry={noop} />)).toEqual([]);
    expect(await violations(<HorizonsPage today="2026-10-02" entries={entries} onOpenEntry={noop} initialView="list" />)).toEqual([]);
    const save = async () => ({ ok: true as const, value: undefined });
    expect(await violations(<LifeStoryEditor story={story} initialArea="health" areas={['career', 'health']} entries={entries} today="2026-10-02" onSave={save} onDelete={save} onClose={noop} onOpenEntry={noop} />)).toEqual([]);
  });

  it('Settings and onboarding have no violations', async () => {
    const noop = () => {};
    expect(await violations(<SettingsPage onVaultChanged={noop} />)).toEqual([]);
    expect(await violations(<OnboardingPage onDone={noop} />, 'div')).toEqual([]);
  });

  it('Editor metadata rail has no violations', async () => {
    const noop = () => {};
    expect(await violations(<MetadataRail mood="sad" tags={['family']} words={12} minutes={1} backlinks={[{ date: '2026-09-29', title: 'Linked' }]} onOpenEntry={noop} onMood={noop} onTags={noop} onDelete={noop} />)).toEqual([]);
  });
});
