import { describe, expect, it } from 'vitest';
import { arrowItem, createItem, duplicate, fitCamera, History, itemBounds, restack, strokeItem, toWorld, zoomAt } from '../../../src/renderer/features/boards/boardModel';
import type { BoardItem } from '../../../src/shared/types/Board';

describe('board camera', () => {
  it('zooms around the pointer, keeping that spot still', () => {
    const cam = { x: 100, y: 50, z: 1 };
    const before = toWorld(cam, { x: 300, y: 200 });
    const after = toWorld(zoomAt(cam, { x: 300, y: 200 }, 2), { x: 300, y: 200 });
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(zoomAt(cam, { x: 0, y: 0 }, 100).z).toBe(4);
  });

  it('fits content in view without zooming past 100%, and stays readable on a phone', () => {
    expect(fitCamera({ x: 0, y: 0, w: 100, h: 100 }, { w: 1000, h: 800 })).toEqual({ z: 1, x: 450, y: 350 });
    const phone = fitCamera({ x: 0, y: 0, w: 3000, h: 2000 }, { w: 390, h: 700 });
    expect(phone.z).toBe(0.5);
  });
});

describe('board items', () => {
  it('centres new items on the click and makes pen strokes relative to their box', () => {
    const note = createItem('sticky', { x: 100, y: 100 });
    expect(note).toMatchObject({ type: 'sticky', x: 0, y: 0, w: 200, h: 200 });
    const stroke = strokeItem([{ x: 10, y: 10 }, { x: 50, y: 30 }], 'ink', 2)!;
    expect(stroke).toMatchObject({ type: 'draw', x: 8, y: 8 });
    expect(stroke.type === 'draw' && stroke.points.slice(0, 2)).toEqual([2, 2]);
    expect(strokeItem([{ x: 1, y: 1 }], 'ink', 2)).toBeNull();
  });

  it('ignores a click-sized arrow and bounds arrows pointing backwards', () => {
    expect(arrowItem({ x: 0, y: 0 }, { x: 4, y: 4 }, 'ink')).toBeNull();
    const back = arrowItem({ x: 100, y: 100 }, { x: 20, y: 60 }, 'ink')!;
    expect(itemBounds(back)).toEqual({ x: 20, y: 60, w: 80, h: 40 });
  });

  it('duplicates with new ids and restacks without losing order', () => {
    const a = createItem('sticky', { x: 0, y: 0 });
    const b = createItem('text', { x: 0, y: 0 });
    const c = createItem('frame', { x: 0, y: 0 });
    const [copy] = duplicate([a]);
    expect(copy.id).not.toBe(a.id);
    expect(copy.x).toBe(a.x + 24);
    expect(restack([a, b, c], new Set([a.id]), 'front').map((i) => i.id)).toEqual([b.id, c.id, a.id]);
    expect(restack([a, b, c], new Set([c.id]), 'back').map((i) => i.id)).toEqual([c.id, a.id, b.id]);
  });

  it('undoes and redoes whole steps', () => {
    const h = new History();
    const one: BoardItem[] = [createItem('sticky', { x: 0, y: 0 })];
    const two: BoardItem[] = [...one, createItem('text', { x: 0, y: 0 })];
    h.push(one);
    expect(h.undo(two)).toBe(one);
    expect(h.redo(one)).toBe(two);
    expect(h.canRedo).toBe(false);
  });
});
