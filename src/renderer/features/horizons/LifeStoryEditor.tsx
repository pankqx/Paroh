import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { EntrySummary } from '../../../shared/types/Entry';
import { areaLabel, STORY_STATUSES, type LifeStory, type LifeStoryInput } from '../../../shared/types/LifeStory';
import type { Result } from '../../../shared/types/Result';
import { formatShortDate } from '../../domain/dates';

interface Props {
  story: LifeStory | null; // null = new story
  initialArea: string;
  areas: string[];
  entries: EntrySummary[];
  today: string;
  onSave: (input: LifeStoryInput) => Promise<Result<unknown>>;
  onDelete?: () => Promise<Result<unknown>>;
  onClose: () => void;
  onOpenEntry: (date: string) => void;
}

/** Title, why, status, when and linked entries (§10). There is no progress field to fill in, by design. */
export function LifeStoryEditor({ story, initialArea, areas, entries, today, onSave, onDelete, onClose, onOpenEntry }: Props) {
  const [title, setTitle] = useState(story?.title ?? '');
  const [area, setArea] = useState(story?.life_area ?? initialArea);
  const [status, setStatus] = useState(story?.status ?? 'dreaming');
  const [created, setCreated] = useState(story?.created ?? today);
  const [whenYear, setWhenYear] = useState(story?.when?.slice(0, 4) ?? '');
  const [whenQuarter, setWhenQuarter] = useState(story?.when?.slice(5) ?? '');
  const [why, setWhy] = useState(story?.why ?? '');
  const [linked, setLinked] = useState<string[]>(story?.linked_entries ?? []);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const year = Number(today.slice(0, 4));
  const years = Array.from({ length: 16 }, (_, i) => String(year - 5 + i));
  if (whenYear && !years.includes(whenYear)) years.push(whenYear);
  const titleOf = new Map(entries.map((e) => [e.date, e.title]));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const when = whenYear ? (whenQuarter ? `${whenYear}-${whenQuarter}` : whenYear) : undefined;
    const result = await onSave({ title, life_area: area, status, created, when, linked_entries: linked, why });
    if (!result.ok) return setError(result.error);
    onClose();
  }

  async function remove() {
    if (!onDelete || !window.confirm(`Delete “${story?.title}”? The file is removed from your vault. To keep it but set it down, choose “Let go” instead.`)) return;
    const result = await onDelete();
    if (!result.ok) return setError(result.error);
    onClose();
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="story-editor-title">
        <form className="story-editor" onSubmit={(e) => void submit(e)}>
          <h2 id="story-editor-title" className="card-title">
            {story ? 'Edit story' : 'New life story'}
          </h2>
          <label className="field">
            <span>Title</span>
            <input ref={titleRef} className="filter-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Run a 5k" required maxLength={200} />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Life area</span>
              <select className="filter-input" value={area} onChange={(e) => setArea(e.target.value)}>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {areaLabel(a)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Started</span>
              <input className="filter-input" type="date" value={created} onChange={(e) => setCreated(e.target.value)} required />
            </label>
          </div>
          <fieldset className="field status-field">
            <legend>Where it is</legend>
            {STORY_STATUSES.map((s) => (
              <label key={s.id} className={`status-option ${status === s.id ? 'on' : ''}`}>
                <input type="radio" name="status" value={s.id} checked={status === s.id} onChange={() => setStatus(s.id)} />
                <span className="status-label">{s.label}</span>
                <span className="micro muted">{s.hint}</span>
              </label>
            ))}
          </fieldset>
          <div className="field-row">
            <label className="field">
              <span>When you picture it (optional)</span>
              <select className="filter-input" value={whenYear} onChange={(e) => setWhenYear(e.target.value)}>
                <option value="">Ongoing, no particular time</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Quarter</span>
              <select className="filter-input" value={whenQuarter} onChange={(e) => setWhenQuarter(e.target.value)} disabled={!whenYear}>
                <option value="">Any time that year</option>
                {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Why it matters</span>
            <textarea className="filter-input why-input" value={why} onChange={(e) => setWhy(e.target.value)} rows={4} placeholder="Freedom. Weekend trips. Drive my parents somewhere without asking anyone." />
          </label>
          <div className="field">
            <span id="linked-label">Linked entries</span>
            {linked.length > 0 && (
              <ul className="linked-list" aria-labelledby="linked-label">
                {linked.map((d) => (
                  <li key={d}>
                    <button type="button" className="link-btn" onClick={() => onOpenEntry(d)}>
                      {formatShortDate(d)}
                      {titleOf.get(d) ? ` · ${titleOf.get(d)}` : ''}
                    </button>
                    <button type="button" className="icon-btn small" aria-label={`Unlink ${d}`} onClick={() => setLinked(linked.filter((x) => x !== d))}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <select className="filter-input" aria-label="Link an entry" value="" onChange={(e) => e.target.value && setLinked([...linked, e.target.value].sort())}>
              <option value="">Link an entry…</option>
              {entries
                .filter((e) => !linked.includes(e.date))
                .slice(0, 200)
                .map((e) => (
                  <option key={e.date} value={e.date}>
                    {formatShortDate(e.date)} {e.date.slice(0, 4)}
                    {e.title ? ` · ${e.title}` : ''}
                  </option>
                ))}
            </select>
          </div>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            {onDelete && (
              <button type="button" className="btn btn-danger" onClick={() => void remove()}>
                Delete
              </button>
            )}
            <span className="grow" />
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
