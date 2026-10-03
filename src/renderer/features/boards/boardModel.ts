import type { BoardItem, BoardItemType } from '../../../shared/types/Board';

export interface Camera {
  x: number;
  y: number;
  z: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
const READABLE_ZOOM = 0.5;

/** Paper colours for notes and shape fills; light enough to read dark ink on in either theme. */
export const PAPERS = [
  { name: 'Butter', color: '#fde68a' },
  { name: 'Peach', color: '#fdd5b8' },
  { name: 'Rose', color: '#fbcfe0' },
  { name: 'Mint', color: '#c9ecd3' },
  { name: 'Sky', color: '#cfe4f7' },
  { name: 'Lilac', color: '#e3d7f6' },
  { name: 'Paper', color: '#fffdf7' },
];
/** Inks for text, pen, arrows and outlines. `ink` follows the theme (dark on Ivory, light on Midnight). */
export const INKS = [
  { name: 'Ink', color: 'ink' },
  { name: 'Ember', color: '#d9692f' },
  { name: 'Gold', color: '#b98a2c' },
  { name: 'Sage', color: '#4f9160' },
  { name: 'Ocean', color: '#357fae' },
  { name: 'Plum', color: '#8b5cb0' },
  { name: 'Rose', color: '#c94d6d' },
];

export function inkCss(color: string): string {
  return color === 'ink' ? 'var(--text)' : color;
}

let counter = 0;
export function newId(): string {
  counter = (counter + 1) % 1e6;
  return `${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** A fresh item of a kind, centred on `at`. */
export function createItem(type: Exclude<BoardItemType, 'draw' | 'arrow' | 'image'>, at: Point, opts: { today?: string; variant?: string } = {}): BoardItem {
  const id = newId();
  const centred = (w: number, h: number) => ({ id, x: Math.round(at.x - w / 2), y: Math.round(at.y - h / 2), w, h });
  switch (type) {
    case 'sticky':
      return { ...centred(200, 200), type, color: opts.variant ?? PAPERS[0].color, text: '', rotate: Math.round((Math.random() - 0.5) * 4 * 10) / 10 };
    case 'text':
      if (opts.variant === 'heading') return { ...centred(420, 64), type, color: 'ink', text: 'A heading', size: 44, serif: true };
      if (opts.variant === 'date') return { ...centred(360, 52), type, color: '#d9692f', text: opts.today ?? '', size: 30, serif: true };
      return { ...centred(260, 40), type, color: 'ink', text: '', size: 20 };
    case 'shape': {
      const shape = (opts.variant as 'rect' | 'ellipse' | 'diamond') ?? 'rect';
      return { ...centred(200, shape === 'rect' ? 130 : 160), type, shape, fill: PAPERS[4].color, stroke: 'ink', text: '' };
    }
    case 'checklist':
      return { ...centred(260, 200), type, title: 'Checklist', color: PAPERS[3].color, entries: [{ text: 'First thing', done: false }, { text: 'Second thing', done: false }] };
    case 'frame':
      return { ...centred(640, 420), type, title: 'Section', color: PAPERS[5].color };
  }
}

/** A pen stroke from world points, stored relative to its own box so it moves as one piece. */
export function strokeItem(points: Point[], color: string, width: number): BoardItem | null {
  if (points.length < 2) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const pad = width;
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  const w = Math.max(...xs) - x + pad;
  const h = Math.max(...ys) - y + pad;
  return { id: newId(), type: 'draw', x, y, w, h, color, width, points: simplify(points).flatMap((p) => [Math.round((p.x - x) * 10) / 10, Math.round((p.y - y) * 10) / 10]) };
}

export function arrowItem(from: Point, to: Point, color: string): BoardItem | null {
  if (Math.hypot(to.x - from.x, to.y - from.y) < 12) return null;
  return { id: newId(), type: 'arrow', x: from.x, y: from.y, w: Math.abs(to.x - from.x), h: Math.abs(to.y - from.y), color, dx: to.x - from.x, dy: to.y - from.y };
}

/** Drops points closer than ~1.5 units so long strokes stay small on disk. */
export function simplify(points: Point[]): Point[] {
  const out: Point[] = [points[0]];
  for (const p of points.slice(1)) {
    const last = out[out.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) >= 1.5) out.push(p);
  }
  if (out.length === 1) out.push(points[points.length - 1]);
  return out;
}

/** The box an item covers on the board. Arrows can point any way, so theirs is normalised. */
export function itemBounds(item: BoardItem): Rect {
  if (item.type === 'arrow') return { x: Math.min(item.x, item.x + item.dx), y: Math.min(item.y, item.y + item.dy), w: Math.abs(item.dx), h: Math.abs(item.dy) };
  return { x: item.x, y: item.y, w: item.w, h: item.h };
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function normalizeRect(a: Point, b: Point): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

export function unionBounds(items: BoardItem[]): Rect | null {
  if (!items.length) return null;
  const boxes = items.map(itemBounds);
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
}

export function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

/** Zooms by `factor` keeping the board point under `screen` still, like a map. */
export function zoomAt(cam: Camera, screen: Point, factor: number): Camera {
  const z = clampZoom(cam.z * factor);
  const k = z / cam.z;
  return { z, x: screen.x - (screen.x - cam.x) * k, y: screen.y - (screen.y - cam.y) * k };
}

/** The camera that shows `rect` inside a viewport of `size`, with some margin, never zooming past 100%. */
export function fitCamera(rect: Rect | null, size: { w: number; h: number }): Camera {
  if (!rect || rect.w === 0 || rect.h === 0) return { x: size.w / 2, y: size.h / 2, z: 1 };
  const margin = Math.min(80, size.w * 0.08);
  const z = clampZoom(Math.min(1, (size.w - margin * 2) / rect.w, (size.h - margin * 2) / rect.h));
  // On a small screen, a whole big board would be too small to read; show its top-left corner legibly instead.
  if (z < READABLE_ZOOM) return { z: READABLE_ZOOM, x: margin - rect.x * READABLE_ZOOM, y: margin + 40 - rect.y * READABLE_ZOOM };
  return { z, x: size.w / 2 - (rect.x + rect.w / 2) * z, y: size.h / 2 - (rect.y + rect.h / 2) * z };
}

export function toWorld(cam: Camera, screen: Point): Point {
  return { x: (screen.x - cam.x) / cam.z, y: (screen.y - cam.y) / cam.z };
}

/** Copies with fresh ids, nudged so the copy is visibly a copy. */
export function duplicate(items: BoardItem[], offset = 24): BoardItem[] {
  return items.map((i) => ({ ...structuredClone(i), id: newId(), x: i.x + offset, y: i.y + offset }));
}

/** Moves the chosen items to the top (or bottom) of the stack, keeping their order among themselves. */
export function restack(items: BoardItem[], ids: Set<string>, to: 'front' | 'back'): BoardItem[] {
  const picked = items.filter((i) => ids.has(i.id));
  const rest = items.filter((i) => !ids.has(i.id));
  return to === 'front' ? [...rest, ...picked] : [...picked, ...rest];
}

/** Undo history of whole item lists; boards are small enough that snapshots are simpler than diffs. */
export class History {
  private past: BoardItem[][] = [];
  private future: BoardItem[][] = [];

  constructor(private limit = 100) {}

  push(snapshot: BoardItem[]) {
    this.past.push(snapshot);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  undo(current: BoardItem[]): BoardItem[] | null {
    const prev = this.past.pop();
    if (!prev) return null;
    this.future.push(current);
    return prev;
  }

  redo(current: BoardItem[]): BoardItem[] | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(current);
    return next;
  }

  get canUndo() {
    return this.past.length > 0;
  }

  get canRedo() {
    return this.future.length > 0;
  }
}
