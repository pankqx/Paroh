import {
  ArrowLeft,
  ArrowUpRight,
  BringToFront,
  CalendarDays,
  Circle,
  Copy,
  Diamond,
  Frame,
  Hand,
  Heading,
  Image as ImageIcon,
  LayoutGrid,
  ListChecks,
  Maximize,
  Minus,
  MousePointer2,
  PenLine,
  Plus,
  Redo2,
  SendToBack,
  Square,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { acceptFor } from '../../../shared/media';
import type { Board, BoardItem } from '../../../shared/types/Board';
import { formatLongDate } from '../../domain/dates';
import { pickFiles, uploadMedia } from '../editor/mediaUpload';
import {
  arrowItem,
  createItem,
  duplicate,
  fitCamera,
  History,
  INKS,
  inkCss,
  intersects,
  itemBounds,
  newId,
  normalizeRect,
  PAPERS,
  restack,
  strokeItem,
  toWorld,
  unionBounds,
  zoomAt,
  type Camera,
  type Point,
} from './boardModel';
import { BoardItemView, pathFrom } from './BoardItemView';

type Tool = 'select' | 'hand' | 'sticky' | 'text' | 'rect' | 'ellipse' | 'diamond' | 'pen' | 'arrow';

const TOOLS: { id: Tool; label: string; key: string; Icon: LucideIcon }[] = [
  { id: 'select', label: 'Select', key: 'V', Icon: MousePointer2 },
  { id: 'hand', label: 'Move the board', key: 'H', Icon: Hand },
  { id: 'sticky', label: 'Sticky note', key: 'S', Icon: StickyNote },
  { id: 'text', label: 'Text', key: 'T', Icon: Type },
  { id: 'rect', label: 'Rectangle', key: 'R', Icon: Square },
  { id: 'ellipse', label: 'Circle', key: 'O', Icon: Circle },
  { id: 'diamond', label: 'Diamond', key: 'D', Icon: Diamond },
  { id: 'pen', label: 'Pen', key: 'P', Icon: PenLine },
  { id: 'arrow', label: 'Arrow', key: 'A', Icon: ArrowUpRight },
];

const WIDGETS: { label: string; hint?: string; Icon: LucideIcon; make: (at: Point, today: string) => BoardItem }[] = [
  { label: 'Checklist', hint: 'Things to tick off', Icon: ListChecks, make: (at) => createItem('checklist', at) },
  { label: 'Section', hint: 'A coloured area to group things', Icon: Frame, make: (at) => createItem('frame', at) },
  { label: 'Heading', hint: 'Big serif title', Icon: Heading, make: (at) => createItem('text', at, { variant: 'heading' }) },
  { label: 'Date stamp', Icon: CalendarDays, make: (at, today) => createItem('text', at, { variant: 'date', today }) },
];

type Drag =
  | { kind: 'pan'; start: Point; cam: Camera }
  | { kind: 'move'; start: Point; origin: Map<string, Point>; before: BoardItem[]; moved: boolean }
  | { kind: 'resize'; id: string; start: Point; origin: { w: number; h: number; dx?: number; dy?: number }; before: BoardItem[] }
  | { kind: 'marquee'; start: Point; now: Point; additive: Set<string> }
  | { kind: 'pen'; points: Point[] }
  | { kind: 'arrow'; from: Point; to: Point };

interface Props {
  initial: Board;
  today: string;
  onBack: () => void;
}

/**
 * A Miro-style board: an endless dotted sheet to pan and zoom, with notes, text, shapes, pen, arrows,
 * pictures and small widgets. Everything autosaves to `boards/<id>.json` in the journal folder.
 */
export function BoardEditor({ initial, today, onBack }: Props) {
  const [board, setBoard] = useState(initial);
  const [items, setItems] = useState<BoardItem[]>(initial.items);
  const [cam, setCam] = useState<Camera>({ x: 0, y: 0, z: 1 });
  const [tool, setTool] = useState<Tool>('select');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [ink, setInk] = useState('ink');
  const [paper, setPaper] = useState(PAPERS[0].color);
  const [widgets, setWidgets] = useState(false);
  const [status, setStatus] = useState<'saved' | 'saving' | 'dirty' | { error: string }>('saved');
  const history = useRef(new History());
  const stage = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const spaceDown = useRef(false);
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<{ dist: number; mid: Point; cam: Camera } | null>(null);
  const itemsRef = useRef(items);
  const [canUndo, setCanUndo] = useState({ undo: false, redo: false });
  const syncHistory = () => setCanUndo({ undo: history.current.canUndo, redo: history.current.canRedo });
  useLayoutEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Start framed on whatever is on the board.
  useLayoutEffect(() => {
    const el = stage.current;
    // Measuring the stage is only possible once it's laid out, so the first camera is set here.
    if (el) setCam(fitCamera(unionBounds(initial.items), { w: el.clientWidth, h: el.clientHeight }));
  }, [initial.items]);

  // Typing into a note is one undo step, taken as editing starts.
  useEffect(() => {
    if (editing) {
      history.current.push(itemsRef.current);
      syncHistory();
    }
  }, [editing]);

  // Autosave, a moment after the last change, and straight away when the board is closed.
  const firstRender = useRef(true);
  const unsaved = useRef<Board | null>(null);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setStatus('dirty');
    unsaved.current = { ...board, items };
    const t = window.setTimeout(async () => {
      setStatus('saving');
      const r = await window.paroh.boards.save({ ...board, items });
      if (r.ok) {
        if (unsaved.current?.items === items) unsaved.current = null;
        setStatus('saved');
        setBoard((b) => ({ ...b, updatedAt: r.value.updatedAt }));
      } else setStatus({ error: r.error });
    }, 700);
    return () => window.clearTimeout(t);
    // `board` changes only through the title and paper here; updatedAt is not a reason to save again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, board.title, board.paper]);

  useEffect(
    () => () => {
      if (unsaved.current) void window.paroh.boards.save(unsaved.current);
    },
    [],
  );

  // Text and checklists grow with what's written in them; keep their stored height true.
  useLayoutEffect(() => {
    const el = world.current;
    if (!el) return;
    let changed = false;
    const nodes = new Map([...el.querySelectorAll<HTMLElement>('[data-id]')].map((n) => [n.dataset.id, n]));
    const next = items.map((item) => {
      if (item.type !== 'text' && item.type !== 'checklist') return item;
      const h = nodes.get(item.id)?.offsetHeight;
      if (!h || Math.abs(h - item.h) < 2) return item;
      changed = true;
      return { ...item, h };
    });
    if (changed) setItems(next);
  }, [items, editing]);

  /** Commits a change with an undo step. */
  const commit = useCallback((next: BoardItem[], before = itemsRef.current) => {
    history.current.push(before);
    setItems(next);
    syncHistory();
  }, []);

  const screenPoint = (e: { clientX: number; clientY: number }): Point => {
    const r = stage.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const worldPoint = (e: { clientX: number; clientY: number }) => toWorld(cam, screenPoint(e));

  const add = useCallback(
    (item: BoardItem, edit = false) => {
      // Sections sit behind everything so notes can be dropped onto them.
      commit(item.type === 'frame' ? [item, ...itemsRef.current] : [...itemsRef.current, item]);
      setSelected(new Set([item.id]));
      if (edit) setEditing(item.id);
      setTool('select');
    },
    [commit],
  );

  const viewCentre = (): Point => {
    const el = stage.current!;
    return toWorld(cam, { x: el.clientWidth / 2, y: el.clientHeight / 2 });
  };

  const addImages = useCallback(
    async (files: File[], at?: Point) => {
      const centre = at ?? viewCentre();
      let offset = 0;
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const saved = await uploadMedia(file);
        if (!saved.ok) {
          setStatus({ error: saved.error });
          continue;
        }
        const size = await imageSize(file);
        const scale = Math.min(1, 480 / Math.max(size.w, size.h));
        const w = Math.round(size.w * scale);
        const h = Math.round(size.h * scale);
        add({ id: newId(), type: 'image', x: Math.round(centre.x - w / 2 + offset), y: Math.round(centre.y - h / 2 + offset), w, h, src: saved.value.path });
        offset += 28;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [add, cam],
  );

  // ----- Pointer handling -----

  function onStagePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (editing) setEditing(null);
    setWidgets(false);
    pointers.current.set(e.pointerId, screenPoint(e));
    stage.current!.setPointerCapture(e.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, cam };
      setDrag(null);
      return;
    }
    const p = worldPoint(e);
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
    const handle = (e.target as HTMLElement).closest<HTMLElement>('[data-handle]');

    if (tool === 'hand' || spaceDown.current || e.button === 1) {
      setDrag({ kind: 'pan', start: screenPoint(e), cam });
      return;
    }
    if (handle) {
      const id = handle.dataset.handle!;
      const item = items.find((i) => i.id === id)!;
      setDrag({ kind: 'resize', id, start: p, origin: { w: item.w, h: item.h, ...(item.type === 'arrow' ? { dx: item.dx, dy: item.dy } : {}) }, before: items });
      return;
    }
    if (tool === 'pen') {
      setDrag({ kind: 'pen', points: [p] });
      return;
    }
    if (tool === 'arrow') {
      setDrag({ kind: 'arrow', from: p, to: p });
      return;
    }
    if (tool !== 'select') {
      const type = tool === 'rect' || tool === 'ellipse' || tool === 'diamond' ? 'shape' : tool;
      const item = createItem(type, p, { variant: type === 'shape' ? tool : type === 'sticky' ? paper : undefined });
      if (item.type === 'text') item.color = ink;
      if (item.type === 'shape') item.stroke = ink;
      add(item, item.type === 'sticky' || item.type === 'text');
      return;
    }
    if (target) {
      const id = target.dataset.id!;
      let next = selected;
      if (e.shiftKey) {
        next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else if (!selected.has(id)) next = new Set([id]);
      setSelected(next);
      const origin = new Map(items.filter((i) => next.has(i.id)).map((i) => [i.id, { x: i.x, y: i.y }]));
      setDrag({ kind: 'move', start: p, origin, before: items, moved: false });
      return;
    }
    // A finger on empty paper moves the board, as on any map; a mouse draws a selection box.
    if (e.pointerType === 'touch') {
      setSelected(new Set());
      setDrag({ kind: 'pan', start: screenPoint(e), cam });
      return;
    }
    setDrag({ kind: 'marquee', start: p, now: p, additive: e.shiftKey ? new Set(selected) : new Set() });
    if (!e.shiftKey) setSelected(new Set());
  }

  function onStagePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, screenPoint(e));
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const start = pinch.current;
      const zoomed = zoomAt(start.cam, start.mid, dist / start.dist);
      setCam({ ...zoomed, x: zoomed.x + mid.x - start.mid.x, y: zoomed.y + mid.y - start.mid.y });
      return;
    }
    if (!drag) return;
    const p = worldPoint(e);
    switch (drag.kind) {
      case 'pan': {
        const s = screenPoint(e);
        setCam({ ...drag.cam, x: drag.cam.x + s.x - drag.start.x, y: drag.cam.y + s.y - drag.start.y });
        break;
      }
      case 'move': {
        const dx = p.x - drag.start.x;
        const dy = p.y - drag.start.y;
        if (!drag.moved && Math.hypot(dx, dy) * cam.z < 3) return;
        if (!drag.moved) setDrag({ ...drag, moved: true });
        setItems((cur) => cur.map((i) => (drag.origin.has(i.id) ? { ...i, x: Math.round(drag.origin.get(i.id)!.x + dx), y: Math.round(drag.origin.get(i.id)!.y + dy) } : i)));
        break;
      }
      case 'resize': {
        const dx = p.x - drag.start.x;
        const dy = p.y - drag.start.y;
        setItems((cur) =>
          cur.map((i) => {
            if (i.id !== drag.id) return i;
            if (i.type === 'arrow') return { ...i, dx: Math.round(drag.origin.dx! + dx), dy: Math.round(drag.origin.dy! + dy) };
            const keep = i.type === 'image' || e.shiftKey;
            const w = Math.max(40, Math.round(drag.origin.w + dx));
            const h = keep ? Math.round((w * drag.origin.h) / drag.origin.w) : Math.max(30, Math.round(drag.origin.h + dy));
            if (i.type === 'draw') {
              const kx = w / drag.origin.w;
              const ky = h / drag.origin.h;
              const before = drag.before.find((b) => b.id === i.id) as typeof i;
              return { ...i, w, h, points: before.points.map((v, k) => Math.round((k % 2 ? v * ky : v * kx) * 10) / 10) };
            }
            return { ...i, w, h };
          }),
        );
        break;
      }
      case 'marquee':
        setDrag({ ...drag, now: p });
        break;
      case 'pen':
        setDrag({ kind: 'pen', points: [...drag.points, p] });
        break;
      case 'arrow':
        setDrag({ ...drag, to: p });
        break;
    }
  }

  function onStagePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pinch.current) {
      if (pointers.current.size < 2) pinch.current = null;
      return;
    }
    if (!drag) return;
    switch (drag.kind) {
      case 'move':
        if (drag.moved) commit(itemsRef.current, drag.before);
        break;
      case 'resize':
        commit(itemsRef.current, drag.before);
        break;
      case 'marquee': {
        const rect = normalizeRect(drag.start, drag.now);
        if (rect.w > 2 || rect.h > 2) {
          const hit = items.filter((i) => intersects(rect, itemBounds(i))).map((i) => i.id);
          setSelected(new Set([...drag.additive, ...hit]));
        }
        break;
      }
      case 'pen': {
        const item = strokeItem(drag.points, ink, 3);
        if (item) commit([...items, item]);
        break;
      }
      case 'arrow': {
        const item = arrowItem(drag.from, drag.to, ink);
        if (item) add(item);
        break;
      }
    }
    setDrag(null);
  }

  function onDoubleClick(e: React.MouseEvent) {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
    if (target) {
      const item = items.find((i) => i.id === target.dataset.id);
      if (item && item.type !== 'draw' && item.type !== 'arrow' && item.type !== 'image') {
        setSelected(new Set([item.id]));
        setEditing(item.id);
      }
      return;
    }
    // Double-click on empty paper drops a note, the quickest way to get a thought down.
    add(createItem('sticky', worldPoint(e), { variant: paper }), true);
  }

  // Wheel pans; pinch or Ctrl+wheel zooms around the pointer.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('.board-text-edit, .checklist-entries')) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const s = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (e.ctrlKey || e.metaKey) setCam((c) => zoomAt(c, s, Math.exp(-e.deltaY * 0.0022)));
      else setCam((c) => ({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ----- Keyboard -----

  const removeSelected = useCallback(() => {
    if (!selected.size) return;
    commit(itemsRef.current.filter((i) => !selected.has(i.id)));
    setSelected(new Set());
  }, [selected, commit]);

  const duplicateSelected = useCallback(() => {
    const copies = duplicate(itemsRef.current.filter((i) => selected.has(i.id)));
    if (!copies.length) return;
    commit([...itemsRef.current, ...copies]);
    setSelected(new Set(copies.map((c) => c.id)));
  }, [selected, commit]);

  const undo = useCallback(() => {
    const prev = history.current.undo(itemsRef.current);
    if (prev) {
      setItems(prev);
      setSelected(new Set());
      syncHistory();
    }
  }, []);
  const redo = useCallback(() => {
    const next = history.current.redo(itemsRef.current);
    if (next) {
      setItems(next);
      syncHistory();
    }
  }, []);

  const zoomBy = (factor: number) => {
    const el = stage.current!;
    setCam((c) => zoomAt(c, { x: el.clientWidth / 2, y: el.clientHeight / 2 }, factor));
  };
  const fit = () => {
    const el = stage.current!;
    setCam(fitCamera(unionBounds(items), { w: el.clientWidth, h: el.clientHeight }));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea, select, [contenteditable]');
      if (typing) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (e.key === ' ') {
        spaceDown.current = true;
        e.preventDefault();
      } else if (mod && k === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && k === 'y') {
        e.preventDefault();
        redo();
      } else if (mod && k === 'd') {
        e.preventDefault();
        duplicateSelected();
      } else if (mod && k === 'a') {
        e.preventDefault();
        setSelected(new Set(itemsRef.current.map((i) => i.id)));
      } else if (mod && (k === '=' || k === '+')) {
        e.preventDefault();
        zoomBy(1.2);
      } else if (mod && k === '-') {
        e.preventDefault();
        zoomBy(1 / 1.2);
      } else if (mod && k === '0') {
        e.preventDefault();
        fit();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeSelected();
      } else if (e.key === 'Escape') {
        if (widgets) setWidgets(false);
        else if (selected.size) setSelected(new Set());
        else if (tool !== 'select') setTool('select');
        else onBack();
      } else if (e.key === 'Enter' && selected.size === 1) {
        const item = itemsRef.current.find((i) => selected.has(i.id));
        if (item && item.type !== 'draw' && item.type !== 'arrow' && item.type !== 'image') {
          e.preventDefault();
          setEditing(item.id);
        }
      } else if (e.key.startsWith('Arrow') && selected.size) {
        e.preventDefault();
        const step = e.shiftKey ? 20 : 2;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        commit(itemsRef.current.map((i) => (selected.has(i.id) ? { ...i, x: i.x + dx, y: i.y + dy } : i)));
      } else if (!mod && !e.altKey) {
        const t = TOOLS.find((x) => x.key.toLowerCase() === k);
        if (t) setTool(t.id);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => e.key === ' ' && (spaceDown.current = false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, tool, widgets, undo, redo, duplicateSelected, removeSelected, onBack, items]);

  // Pasted or dropped pictures land on the board.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) {
        e.preventDefault();
        void addImages(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addImages]);

  // ----- Selection toolbar actions -----

  const selection = useMemo(() => items.filter((i) => selected.has(i.id)), [items, selected]);
  const selBounds = unionBounds(selection);

  function recolour(kind: 'paper' | 'ink', color: string) {
    if (kind === 'paper') setPaper(color);
    else setInk(color);
    if (!selection.length) return;
    commit(
      items.map((i) => {
        if (!selected.has(i.id)) return i;
        if (kind === 'paper') {
          if (i.type === 'sticky' || i.type === 'checklist' || i.type === 'frame') return { ...i, color };
          if (i.type === 'shape') return { ...i, fill: color };
        } else {
          if (i.type === 'text' || i.type === 'draw' || i.type === 'arrow') return { ...i, color };
          if (i.type === 'shape') return { ...i, stroke: color };
        }
        return i;
      }),
    );
  }

  const showsPaper = selection.length ? selection.some((i) => ['sticky', 'checklist', 'frame', 'shape'].includes(i.type)) : tool === 'sticky';
  const showsInk = selection.length ? selection.some((i) => ['text', 'draw', 'arrow', 'shape'].includes(i.type)) : ['text', 'pen', 'arrow', 'rect', 'ellipse', 'diamond'].includes(tool);

  const single = selection.length === 1 ? selection[0] : null;
  const marquee = drag?.kind === 'marquee' ? normalizeRect(drag.start, drag.now) : null;
  const paperStyle = board.paper ?? 'dots';
  const dot = 24 * cam.z;

  return (
    <div className="board-editor">
      <div className="board-topbar">
        <button className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />
          Boards
        </button>
        <input className="board-title-input" aria-label="Board name" value={board.title} onChange={(e) => setBoard({ ...board, title: e.target.value })} />
        <span className={`board-status ${typeof status === 'object' ? 'error-text' : ''}`} role="status">
          {typeof status === 'object' ? `Not saved: ${status.error}` : status === 'saved' ? 'Saved' : 'Saving…'}
        </span>
        <span className="grow" />
        <button className="icon-btn" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!canUndo.undo} onClick={undo}>
          <Undo2 size={17} aria-hidden="true" />
        </button>
        <button className="icon-btn" aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={!canUndo.redo} onClick={redo}>
          <Redo2 size={17} aria-hidden="true" />
        </button>
        <div className="segmented board-paper" role="group" aria-label="Paper">
          {(['dots', 'grid', 'plain'] as const).map((p) => (
            <button key={p} className={`seg-btn ${paperStyle === p ? 'on' : ''}`} aria-pressed={paperStyle === p} onClick={() => setBoard({ ...board, paper: p })}>
              {p === 'dots' ? 'Dots' : p === 'grid' ? 'Grid' : 'Plain'}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={stage}
        className={`board-stage paper-${paperStyle} tool-${tool} ${drag?.kind === 'pan' ? 'panning' : ''}`}
        style={{ backgroundSize: `${dot}px ${dot}px`, backgroundPosition: `${cam.x}px ${cam.y}px` }}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerUp}
        onDoubleClick={onDoubleClick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void addImages(Array.from(e.dataTransfer.files), worldPoint(e));
        }}
        role="application"
        aria-label={`Board: ${board.title}. ${items.length} items. Press V to select, S for a note, T for text, P for the pen.`}
      >
        <div ref={world} className="board-world" style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})` }}>
          {items.map((item) => (
            <BoardItemView
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              editing={editing === item.id}
              onChange={(next) => {
                // Typing is one undo step per edit session; ticking a box is its own step.
                if (editing !== item.id) commit(items.map((i) => (i.id === item.id ? next : i)));
                else setItems((cur) => cur.map((i) => (i.id === item.id ? next : i)));
              }}
              onStopEdit={() => setEditing(null)}
            />
          ))}
          {drag?.kind === 'pen' && (
            <svg className="board-live" aria-hidden="true">
              <path d={pathFrom(drag.points.flatMap((p) => [p.x, p.y]))} stroke={inkCss(ink)} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {drag?.kind === 'arrow' && (
            <svg className="board-live" aria-hidden="true">
              <line x1={drag.from.x} y1={drag.from.y} x2={drag.to.x} y2={drag.to.y} stroke={inkCss(ink)} strokeWidth={2.5} strokeLinecap="round" />
            </svg>
          )}
          {selBounds && !editing && (
            <div className="selection-box" style={{ left: selBounds.x - 6, top: selBounds.y - 6, width: selBounds.w + 12, height: selBounds.h + 12, borderWidth: 1.5 / cam.z }}>
              {single && (
                <span
                  className="resize-handle"
                  data-handle={single.id}
                  style={single.type === 'arrow' ? { left: single.dx < 0 ? 6 - 7 / cam.z : 'auto', right: single.dx < 0 ? 'auto' : 6 - 7 / cam.z, top: single.dy < 0 ? 6 - 7 / cam.z : 'auto', bottom: single.dy < 0 ? 'auto' : 6 - 7 / cam.z, width: 14 / cam.z, height: 14 / cam.z } : { width: 14 / cam.z, height: 14 / cam.z, right: -7 / cam.z, bottom: -7 / cam.z }}
                  aria-hidden="true"
                />
              )}
            </div>
          )}
          {marquee && <div className="marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h, borderWidth: 1 / cam.z }} />}
        </div>

        {items.length === 0 && (
          <div className="board-empty" aria-hidden="true">
            <div className="board-empty-title">An empty board</div>
            <p>Double-click anywhere for a note, pick a tool on the left, or drop in a photo.</p>
          </div>
        )}
      </div>

      <div className="board-tools" role="toolbar" aria-label="Board tools" onPointerDown={(e) => e.stopPropagation()}>
        {TOOLS.map((t) => (
          <button key={t.id} className={`board-tool ${tool === t.id ? 'on' : ''}`} aria-label={`${t.label} (${t.key})`} aria-pressed={tool === t.id} title={`${t.label} (${t.key})`} onClick={() => setTool(t.id)}>
            <t.Icon size={19} aria-hidden="true" />
          </button>
        ))}
        <span className="board-tools-sep" aria-hidden="true" />
        <button className="board-tool" aria-label="Add pictures" title="Add pictures" onClick={() => void pickFiles(acceptFor('image'), true).then((f) => addImages(f))}>
          <ImageIcon size={19} aria-hidden="true" />
        </button>
        <div className="board-widgets-wrap">
          <button className={`board-tool ${widgets ? 'on' : ''}`} aria-label="Widgets" aria-expanded={widgets} title="Widgets" onClick={() => setWidgets((w) => !w)}>
            <LayoutGrid size={19} aria-hidden="true" />
          </button>
          {widgets && (
            <div className="board-widgets" role="menu" aria-label="Widgets">
              {WIDGETS.map((w) => (
                <button
                  key={w.label}
                  role="menuitem"
                  className="board-widget"
                  onClick={() => {
                    add(w.make(viewCentre(), formatLongDate(today)));
                    setWidgets(false);
                  }}
                >
                  <span className="card-icon">
                    <w.Icon size={16} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="board-widget-name">{w.label}</span>
                    <span className="board-widget-hint">{w.hint ?? formatLongDate(today)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {(showsPaper || showsInk || selection.length > 0) && (
        <div className="board-context" role="toolbar" aria-label="Selection" onPointerDown={(e) => e.stopPropagation()}>
          {showsPaper && (
            <div className="board-swatches" role="group" aria-label="Paper colour">
              {PAPERS.map((p) => (
                <button key={p.color} className={`board-swatch ${paper === p.color ? 'on' : ''}`} style={{ background: p.color }} aria-label={p.name} title={p.name} onClick={() => recolour('paper', p.color)} />
              ))}
            </div>
          )}
          {showsInk && (
            <div className="board-swatches" role="group" aria-label="Ink colour">
              {INKS.map((p) => (
                <button key={p.color} className={`board-swatch ink ${ink === p.color ? 'on' : ''}`} style={{ color: inkCss(p.color) }} aria-label={p.name} title={p.name} onClick={() => recolour('ink', p.color)}>
                  <span />
                </button>
              ))}
            </div>
          )}
          {selection.length > 0 && (
            <div className="board-actions">
              <button className="icon-btn small" aria-label="Bring to front" title="Bring to front" onClick={() => commit(restack(items, selected, 'front'))}>
                <BringToFront size={15} aria-hidden="true" />
              </button>
              <button className="icon-btn small" aria-label="Send to back" title="Send to back" onClick={() => commit(restack(items, selected, 'back'))}>
                <SendToBack size={15} aria-hidden="true" />
              </button>
              <button className="icon-btn small" aria-label="Duplicate" title="Duplicate (Ctrl+D)" onClick={duplicateSelected}>
                <Copy size={15} aria-hidden="true" />
              </button>
              <button className="icon-btn small" aria-label="Delete" title="Delete" onClick={removeSelected}>
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="board-zoom" role="group" aria-label="Zoom" onPointerDown={(e) => e.stopPropagation()}>
        <button className="icon-btn small" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
          <Minus size={15} aria-hidden="true" />
        </button>
        <button className="board-zoom-value" aria-label="Fit everything in view" title="Fit (Ctrl+0)" onClick={fit}>
          {Math.round(cam.z * 100)}%
        </button>
        <button className="icon-btn small" aria-label="Zoom in" onClick={() => zoomBy(1.2)}>
          <Plus size={15} aria-hidden="true" />
        </button>
        <button className="icon-btn small" aria-label="Fit everything in view" onClick={fit}>
          <Maximize size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function imageSize(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth || 400, h: img.naturalHeight || 300 });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ w: 400, h: 300 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
