import { ImagePlus, Move, Palette, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { acceptFor } from '../../../shared/media';
import type { Entry } from '../../../shared/types/Entry';
import { MOOD_EMOJI } from '../../components/MoodSelector';
import { GRADIENT_COVERS, gradientCss, isLightCover } from '../../domain/covers';
import { formatLongDate } from '../../domain/dates';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import { pickFiles, uploadMedia } from './mediaUpload';

interface Props {
  entry: Entry;
  minutes: number;
  autoFocus: boolean;
  onChange: (patch: Partial<Entry>) => void;
  onTitleEnter: () => void;
  onError: (message: string) => void;
}

/**
 * The top of the page, like a blog post: a cover (a photo or a hand-mixed gradient) running edge to
 * edge with the title set large over it, or, with no cover, the title on the paper itself.
 */
export function PageHeader({ entry, minutes, autoFocus, onChange, onTitleEnter, onError }: Props) {
  const [menu, setMenu] = useState(false);
  const [repositioning, setRepositioning] = useState(false);
  const gradient = gradientCss(entry.cover);
  const photo = entry.cover && !gradient ? entry.cover : undefined;
  const { url, error } = useMediaUrl(photo);
  const y = entry.cover_y ?? 50;
  const drag = useRef<{ startY: number; startPos: number; height: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && (e.preventDefault(), setMenu(false));
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [menu]);

  async function uploadCover() {
    setMenu(false);
    const [file] = await pickFiles(acceptFor('image'), false);
    if (!file) return;
    const saved = await uploadMedia(file);
    if (!saved.ok) return onError(saved.error);
    onChange({ cover: saved.value.path, cover_y: 50 });
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!repositioning) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startPos: y, height: e.currentTarget.clientHeight };
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    // Dragging the picture down shows more of its top, like sliding a print in a frame.
    const delta = ((e.clientY - drag.current.startY) / drag.current.height) * 100;
    onChange({ cover_y: Math.max(0, Math.min(100, Math.round(drag.current.startPos - delta))) });
  }

  const hasCover = Boolean(entry.cover);
  const light = isLightCover(entry.cover);

  const coverMenu = menu && (
    <div className="cover-menu" role="dialog" aria-label="Cover" ref={menuRef}>
      <button className="cover-menu-upload" onClick={() => void uploadCover()}>
        <Upload size={16} aria-hidden="true" />
        Upload a photo
      </button>
      <div className="cover-menu-label">Or a colour wash</div>
      <div className="cover-swatches">
        {GRADIENT_COVERS.map((g) => (
          <button
            key={g.id}
            className={`cover-swatch ${entry.cover === `gradient:${g.id}` ? 'on' : ''}`}
            style={{ background: g.css }}
            aria-label={g.label}
            title={g.label}
            onClick={() => {
              onChange({ cover: `gradient:${g.id}`, cover_y: undefined });
              setMenu(false);
            }}
          />
        ))}
      </div>
      {hasCover && (
        <button
          className="cover-menu-remove"
          onClick={() => {
            onChange({ cover: undefined, cover_y: undefined });
            setMenu(false);
          }}
        >
          <Trash2 size={15} aria-hidden="true" />
          Remove cover
        </button>
      )}
    </div>
  );

  const title = (
    // A textarea so long titles wrap onto a second line instead of being cut off.
    <textarea
      className="page-title-input"
      placeholder="Untitled"
      rows={1}
      value={entry.title}
      aria-label="Entry title"
      autoFocus={autoFocus}
      onChange={(e) => onChange({ title: e.target.value.replace(/\n/g, ' ') })}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onTitleEnter();
        }
      }}
    />
  );
  const byline = (
    <div className="page-byline">
      <span>{formatLongDate(entry.date)}</span>
      {entry.mood && (
        <>
          <span className="dot-sep" aria-hidden="true" />
          <span aria-label={`Mood: ${entry.mood}`}>{MOOD_EMOJI[entry.mood]}</span>
        </>
      )}
      <span className="dot-sep" aria-hidden="true" />
      <span>{minutes < 1 ? 'Under a minute' : `${minutes} min read`}</span>
      {entry.tags.slice(0, 4).map((t) => (
        <span key={t} className="byline-tag">
          #{t}
        </span>
      ))}
    </div>
  );

  if (!hasCover)
    return (
      <header className="page-header no-cover">
        <div className="page-header-tools">
          <button className="btn btn-ghost btn-small" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
            <ImagePlus size={15} aria-hidden="true" />
            Add cover
          </button>
          {coverMenu}
        </div>
        {title}
        {byline}
      </header>
    );

  return (
    <header className={`page-header with-cover ${light ? 'light-cover' : ''} ${repositioning ? 'repositioning' : ''}`}>
      <div
        className="cover"
        style={gradient ? { background: gradient } : url ? { backgroundImage: `url(${url})`, backgroundPosition: `50% ${y}%` } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        role={repositioning ? 'slider' : undefined}
        aria-label={repositioning ? 'Cover position' : undefined}
        aria-valuenow={repositioning ? y : undefined}
        tabIndex={repositioning ? 0 : undefined}
        onKeyDown={(e) => {
          if (!repositioning) return;
          if (e.key === 'ArrowUp') onChange({ cover_y: Math.max(0, y - 5) });
          if (e.key === 'ArrowDown') onChange({ cover_y: Math.min(100, y + 5) });
          if (e.key === 'Enter' || e.key === 'Escape') setRepositioning(false);
        }}
      >
        {error && <div className="cover-missing">{error}</div>}
        {repositioning && <div className="cover-hint">Drag the photo up or down, then press Done</div>}
      </div>
      <div className="cover-tools">
        {photo && (
          <button className="cover-tool" onClick={() => setRepositioning((r) => !r)} aria-pressed={repositioning}>
            <Move size={14} aria-hidden="true" />
            {repositioning ? 'Done' : 'Reposition'}
          </button>
        )}
        <button className="cover-tool" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
          <Palette size={14} aria-hidden="true" />
          Change cover
        </button>
        {coverMenu}
      </div>
      <div className="cover-title">
        {title}
        {byline}
      </div>
    </header>
  );
}
