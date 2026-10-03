import { LayoutDashboard, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { Board, BoardSummary } from '../../../shared/types/Board';
import { BoardEditor } from './BoardEditor';

/** The list of boards, each with a little map of what's on it, and the board itself once opened. */
export function BoardsPage({ today }: { today: string }) {
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [open, setOpen] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await window.paroh.boards.list();
    if (r.ok) setBoards(r.value);
    else setError(r.error);
  }, []);

  useEffect(() => {
    void window.paroh.boards.list().then((r) => (r.ok ? setBoards(r.value) : setError(r.error)));
  }, []);

  async function create() {
    const r = await window.paroh.boards.create('Untitled board');
    if (r.ok) setOpen(r.value);
    else setError(r.error);
  }

  async function openBoard(id: string) {
    const r = await window.paroh.boards.load(id);
    if (r.ok) setOpen(r.value);
    else setError(r.error);
  }

  async function remove(b: BoardSummary) {
    if (!window.confirm(`Delete the board “${b.title}”? Its pictures stay in your journal folder.`)) return;
    const r = await window.paroh.boards.remove(b.id);
    if (!r.ok) setError(r.error);
    await load();
  }

  if (open)
    return (
      <BoardEditor
        key={open.id}
        initial={open}
        today={today}
        onBack={() => {
          setOpen(null);
          void load();
        }}
      />
    );

  return (
    <div className="page boards-page">
      <div className="page-head">
        <div>
          <div className="page-kicker">Think in space</div>
          <h1 className="page-title">Boards</h1>
          <p className="page-sub">Endless paper for plans, mood boards and messy thinking. Notes, shapes, pen, pictures and widgets.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => void create()}>
          <Plus size={17} aria-hidden="true" />
          New board
        </button>
      </div>
      {error && (
        <div className="banner-error" role="alert">
          {error}{' '}
          <button className="link-btn" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}
      {boards && boards.length === 0 && (
        <button className="board-card board-card-new" onClick={() => void create()}>
          <LayoutDashboard size={28} aria-hidden="true" />
          <span className="board-card-title">Start your first board</span>
          <span className="board-card-meta">Double-click anywhere on it to drop a note</span>
        </button>
      )}
      {boards && boards.length > 0 && (
        <ul className="board-grid">
          {boards.map((b) => (
            <li key={b.id} className="board-card">
              <button className="board-card-open" onClick={() => void openBoard(b.id)} aria-label={`Open ${b.title}`}>
                <BoardThumb board={b} />
                <span className="board-card-title">{b.title}</span>
                <span className="board-card-meta">
                  {b.itemCount} {b.itemCount === 1 ? 'thing' : 'things'} · {new Date(b.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </button>
              <button className="icon-btn small board-card-delete" aria-label={`Delete ${b.title}`} onClick={() => void remove(b)}>
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BoardThumb({ board }: { board: BoardSummary }) {
  const boxes = board.preview;
  if (!boxes.length) return <span className="board-thumb empty" aria-hidden="true" />;
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const w = Math.max(...boxes.map((b) => b.x + b.w)) - x || 1;
  const h = Math.max(...boxes.map((b) => b.y + b.h)) - y || 1;
  const pad = Math.max(w, h) * 0.08;
  return (
    <svg className="board-thumb" viewBox={`${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {boxes.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width={Math.max(b.w, 4)}
          height={Math.max(b.h, 4)}
          rx={b.type === 'sticky' ? 4 : b.type === 'frame' ? 14 : 8}
          className={`thumb-${b.type}`}
          style={b.color && b.color !== 'ink' && b.type !== 'draw' && b.type !== 'arrow' && b.type !== 'text' ? { fill: b.color } : undefined}
        />
      ))}
    </svg>
  );
}
