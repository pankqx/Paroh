import type { CSSProperties } from 'react';
import type { BoardItem } from '../../../shared/types/Board';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import { inkCss } from './boardModel';

interface Props {
  item: BoardItem;
  selected: boolean;
  editing: boolean;
  /** Commits a change to this item (typing, ticking a box). */
  onChange: (next: BoardItem) => void;
  onStopEdit: () => void;
}

/** One thing on the board. Positioned in board units; the parent scales the whole world. */
export function BoardItemView({ item, selected, editing, onChange, onStopEdit }: Props) {
  const box: CSSProperties = { left: item.x, top: item.y, width: item.w, height: item.h, transform: item.rotate ? `rotate(${item.rotate}deg)` : undefined };
  const cls = `board-item item-${item.type} ${selected ? 'selected' : ''} ${editing ? 'editing' : ''}`;
  const textArea = (value: string, set: (v: string) => void, style?: CSSProperties, placeholder = 'Write something') => (
    <textarea
      className="board-text-edit"
      autoFocus
      value={value}
      placeholder={placeholder}
      style={style}
      aria-label="Edit text"
      onChange={(e) => set(e.target.value)}
      onBlur={onStopEdit}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) onStopEdit();
      }}
    />
  );

  switch (item.type) {
    case 'sticky':
      return (
        <div className={cls} data-id={item.id} style={{ ...box, background: item.color }}>
          {editing ? textArea(item.text, (text) => onChange({ ...item, text })) : <div className="sticky-text">{item.text || <span className="board-placeholder">Double-click to write</span>}</div>}
        </div>
      );
    case 'text': {
      const style: CSSProperties = { fontSize: item.size, color: inkCss(item.color), fontFamily: item.serif ? 'var(--font-serif)' : undefined };
      return (
        <div className={cls} data-id={item.id} style={{ ...box, height: 'auto', minHeight: item.h }}>
          {editing ? textArea(item.text, (text) => onChange({ ...item, text }), style, 'Type here') : <div className="board-text" style={style}>{item.text || <span className="board-placeholder">Type here</span>}</div>}
        </div>
      );
    }
    case 'shape': {
      const stroke = inkCss(item.stroke);
      return (
        <div className={cls} data-id={item.id} style={box}>
          <svg className="shape-svg" viewBox={`0 0 ${item.w} ${item.h}`} preserveAspectRatio="none" aria-hidden="true">
            {item.shape === 'rect' && <rect x="1.5" y="1.5" width={item.w - 3} height={item.h - 3} rx="16" fill={item.fill} stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />}
            {item.shape === 'ellipse' && <ellipse cx={item.w / 2} cy={item.h / 2} rx={item.w / 2 - 1.5} ry={item.h / 2 - 1.5} fill={item.fill} stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />}
            {item.shape === 'diamond' && <polygon points={`${item.w / 2},1.5 ${item.w - 1.5},${item.h / 2} ${item.w / 2},${item.h - 1.5} 1.5,${item.h / 2}`} fill={item.fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
          </svg>
          <div className="shape-text">{editing ? textArea(item.text, (text) => onChange({ ...item, text }), { textAlign: 'center' }, 'Label') : item.text}</div>
        </div>
      );
    }
    case 'draw': {
      const d = pathFrom(item.points);
      return (
        <svg className={cls} data-id={item.id} style={{ ...box, overflow: 'visible' }} viewBox={`0 0 ${item.w} ${item.h}`} aria-hidden="true">
          <path d={d} fill="none" stroke={inkCss(item.color)} strokeWidth={item.width} strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} fill="none" stroke="transparent" strokeWidth={Math.max(14, item.width + 10)} className="draw-hit" />
        </svg>
      );
    }
    case 'arrow': {
      const minX = Math.min(0, item.dx);
      const minY = Math.min(0, item.dy);
      const w = Math.abs(item.dx) || 1;
      const h = Math.abs(item.dy) || 1;
      const color = inkCss(item.color);
      const angle = Math.atan2(item.dy, item.dx);
      const head = 14;
      const tip = { x: item.dx - minX, y: item.dy - minY };
      const left = { x: tip.x - head * Math.cos(angle - 0.45), y: tip.y - head * Math.sin(angle - 0.45) };
      const right = { x: tip.x - head * Math.cos(angle + 0.45), y: tip.y - head * Math.sin(angle + 0.45) };
      return (
        <svg className={cls} data-id={item.id} style={{ left: item.x + minX, top: item.y + minY, width: w, height: h, overflow: 'visible' }} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
          <line x1={-minX} y1={-minY} x2={tip.x} y2={tip.y} stroke="transparent" strokeWidth="16" className="draw-hit" />
          <line x1={-minX} y1={-minY} x2={tip.x} y2={tip.y} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <polyline points={`${left.x},${left.y} ${tip.x},${tip.y} ${right.x},${right.y}`} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    case 'image':
      return <BoardImage item={item} cls={cls} box={box} />;
    case 'checklist': {
      const done = item.entries.filter((e) => e.done).length;
      return (
        <div className={cls} data-id={item.id} style={{ ...box, height: 'auto', minHeight: item.h, ['--paper' as string]: item.color }}>
          <div className="checklist-head">
            <span className="checklist-title">{item.title}</span>
            <span className="checklist-count">
              {done}/{item.entries.length}
            </span>
          </div>
          {editing ? (
            textArea(
              [item.title, ...item.entries.map((e) => e.text)].join('\n'),
              (v) => {
                const [title, ...lines] = v.split('\n');
                onChange({ ...item, title, entries: lines.map((text, i) => ({ text, done: item.entries[i]?.text === text ? item.entries[i].done : false })) });
              },
              undefined,
              'Title, then one item per line',
            )
          ) : (
            <ul className="checklist-entries">
              {item.entries.map((e, i) => (
                <li key={i} className={e.done ? 'done' : ''}>
                  <input
                    type="checkbox"
                    checked={e.done}
                    aria-label={e.text || 'Item'}
                    onPointerDown={(ev) => ev.stopPropagation()}
                    onChange={() => onChange({ ...item, entries: item.entries.map((x, k) => (k === i ? { ...x, done: !x.done } : x)) })}
                  />
                  <span>{e.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }
    case 'frame':
      return (
        <div className={cls} data-id={item.id} style={{ ...box, ['--paper' as string]: item.color }}>
          <div className="frame-title">
            {editing ? (
              <input
                className="frame-title-edit"
                autoFocus
                aria-label="Section title"
                value={item.title}
                onChange={(e) => onChange({ ...item, title: e.target.value })}
                onBlur={onStopEdit}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter' || e.key === 'Escape') onStopEdit();
                }}
              />
            ) : (
              item.title || 'Section'
            )}
          </div>
        </div>
      );
  }
}

function BoardImage({ item, cls, box }: { item: Extract<BoardItem, { type: 'image' }>; cls: string; box: CSSProperties }) {
  const { url, error } = useMediaUrl(item.src);
  return (
    <div className={cls} data-id={item.id} style={box}>
      {url ? <img src={url} alt="" draggable={false} /> : <div className="board-image-missing">{error ?? 'Loading…'}</div>}
    </div>
  );
}

/** A smooth path through the points (midpoint quadratic curves), so pen strokes look drawn, not plotted. */
export function pathFrom(flat: number[]): string {
  if (flat.length < 4) return '';
  let d = `M${flat[0]},${flat[1]}`;
  for (let i = 2; i < flat.length - 2; i += 2) {
    const mx = (flat[i] + flat[i + 2]) / 2;
    const my = (flat[i + 1] + flat[i + 3]) / 2;
    d += ` Q${flat[i]},${flat[i + 1]} ${mx},${my}`;
  }
  d += ` L${flat[flat.length - 2]},${flat[flat.length - 1]}`;
  return d;
}
