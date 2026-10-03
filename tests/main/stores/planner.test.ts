import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PlannerStore } from '../../../src/main/stores/PlannerStore';
import { NodeVaultFs } from '../../../src/main/vault/NodeVaultFs';
import type { Result } from '../../../src/shared/types/Result';

let root: string;
let store: PlannerStore;
const value = <T>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paroh-planner-'));
  store = new PlannerStore(new NodeVaultFs(root));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('PlannerStore', () => {
  it('starts empty', async () => {
    expect(value(await store.list())).toEqual({ events: [], goals: [] });
  });

  it('saves, edits and removes plans, tidying what does not apply', async () => {
    const trip = value(await store.saveEvent({ title: '  Hills trip ', start: '2026-10-12', end: '2026-10-15', time: '09:00', area: 'travel', notes: ' ' }));
    expect(trip).toMatchObject({ title: 'Hills trip', start: '2026-10-12', end: '2026-10-15', area: 'travel' });
    expect(trip.time).toBeUndefined();
    expect(trip.notes).toBeUndefined();
    const oneDay = value(await store.saveEvent({ title: 'Dentist', start: '2026-10-05', end: '2026-10-05', time: '10:30', area: 'health' }));
    expect(oneDay.end).toBeUndefined();
    expect(oneDay.time).toBe('10:30');
    value(await store.saveEvent({ title: 'Hills trip', start: '2026-10-13', end: '2026-10-15', area: 'travel', milestone: true }, trip.id));
    expect(value(await store.list()).events.find((e) => e.id === trip.id)).toMatchObject({ start: '2026-10-13', milestone: true });
    value(await store.removeEvent(oneDay.id));
    expect(value(await store.list()).events).toHaveLength(1);
  });

  it('refuses plans that make no sense', async () => {
    expect((await store.saveEvent({ title: '', start: '2026-10-01', area: 'work' })).ok).toBe(false);
    expect((await store.saveEvent({ title: 'x', start: '2026-02-30', area: 'work' })).ok).toBe(false);
    expect((await store.saveEvent({ title: 'x', start: '2026-10-05', end: '2026-10-01', area: 'work' })).ok).toBe(false);
    expect((await store.saveEvent({ title: 'x', start: '2026-10-05', time: '25:00', area: 'work' })).ok).toBe(false);
    expect((await store.saveEvent({ title: 'x', start: '2026-10-05', area: 'party' as never })).ok).toBe(false);
    expect((await store.saveEvent({ title: 'x', start: '2026-10-05', area: 'work' }, 'missing')).ok).toBe(false);
  });

  it('keeps month and year goals with clamped progress', async () => {
    const g = value(await store.saveGoal({ period: '2026-10', text: 'Read two books', area: 'learning', progress: 140 }));
    expect(g.progress).toBe(100);
    value(await store.saveGoal({ period: '2026', text: 'Run a 10k', area: 'health', progress: 30 }));
    expect((await store.saveGoal({ period: '2026-13', text: 'x', area: 'health', progress: 0 })).ok).toBe(false);
    value(await store.saveGoal({ ...g, progress: 40 }, g.id));
    expect(value(await store.list()).goals.map((x) => x.progress)).toEqual([40, 30]);
    value(await store.removeGoal(g.id));
    expect(value(await store.list()).goals).toHaveLength(1);
  });
});
