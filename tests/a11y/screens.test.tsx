import axe from 'axe-core';
import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import type { ParohApi } from '../../src/shared/ipc-contract';
import { CanvasPage } from '../../src/renderer/features/canvas/CanvasPage';
import { MetadataRail } from '../../src/renderer/features/editor/MetadataRail';
import { Sidebar } from '../../src/renderer/app/Sidebar';
import type { EntrySummary } from '../../src/shared/types/Entry';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
window.paroh = {
  entries: { save: async (e) => ({ ok: true, value: e }), load: async () => ({ ok: true, value: null }), delete: async () => ({ ok: true, value: undefined }), list: async () => ({ ok: true, value: [] }) },
  vault: { info: async () => ({ path: '/home/me/Paroh' }), choose: async () => null },
} satisfies ParohApi;

const entries: EntrySummary[] = [
  { date: '2026-10-01', title: 'A quiet morning', mood: 'ok', tags: ['calm'], excerpt: 'Sample text' },
  { date: '2026-09-29', title: '', tags: [], excerpt: '' },
];

async function violations(ui: ReactElement) {
  const host = document.createElement('main');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(ui));
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
    expect(await violations(<CanvasPage today="2026-10-02" entries={entries} loadError={null} onOpenEntry={noop} onEntriesChanged={noop} />)).toEqual([]);
    expect(await violations(<CanvasPage today="2026-10-02" entries={[]} loadError={null} onOpenEntry={noop} onEntriesChanged={noop} />)).toEqual([]);
  });

  it('Sidebar has no violations', async () => {
    const noop = () => {};
    expect(await violations(<Sidebar view={{ name: 'canvas' }} today="2026-10-02" vaultPath="/home/me/Paroh" onCanvas={noop} onToday={noop} onChooseVault={noop} />)).toEqual([]);
  });

  it('Editor metadata rail has no violations', async () => {
    const noop = () => {};
    expect(await violations(<MetadataRail mood="sad" tags={['family']} words={12} minutes={1} onMood={noop} onTags={noop} onDelete={noop} />)).toEqual([]);
  });
});
