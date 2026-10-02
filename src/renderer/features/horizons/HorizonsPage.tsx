import { useState, type FormEvent } from 'react';
import type { EntrySummary } from '../../../shared/types/Entry';
import { areaLabel, STORY_STATUSES, type LifeStory } from '../../../shared/types/LifeStory';
import { formatShortDate } from '../../domain/dates';
import type { Zoom } from '../../domain/horizons';
import { useHorizons } from '../../hooks/useHorizons';
import { LifeStoryEditor } from './LifeStoryEditor';
import { TimelineCanvas } from './TimelineCanvas';

interface Props {
  today: string;
  entries: EntrySummary[];
  onOpenEntry: (date: string) => void;
  initialView?: 'timeline' | 'list';
}

const STATUS_LABEL = Object.fromEntries(STORY_STATUSES.map((s) => [s.id, s.label]));

/** Life Stories across the years, as a timeline or as a plain list (feature-specifications.md §10). */
export function HorizonsPage({ today, entries, onOpenEntry, initialView = 'timeline' }: Props) {
  const { areas, stories, error, dismissError, run } = useHorizons();
  const [view, setView] = useState(initialView);
  const [zoom, setZoom] = useState<Zoom>('year');
  const [editing, setEditing] = useState<{ story: LifeStory | null; area: string } | null>(null);
  const [newArea, setNewArea] = useState('');

  async function addArea(e: FormEvent) {
    e.preventDefault();
    if ((await run(() => window.paroh.horizons.addArea(newArea))).ok) setNewArea('');
  }

  const toggle = <T extends string>(value: T, current: T, set: (v: T) => void, label: string) => (
    <button className={`seg-btn ${current === value ? 'on' : ''}`} aria-pressed={current === value} onClick={() => set(value)}>
      {label}
    </button>
  );

  return (
    <div className="page horizons">
      <div className="page-head">
        <div>
          <h1 className="page-title">Horizons</h1>
          <span className="muted micro">Life stories, not goals. Each one keeps its why. Nothing here is measured in percentages.</span>
        </div>
        <div className="page-head-actions">
          <div className="segmented" role="group" aria-label="View">
            {toggle('timeline', view, setView, 'Timeline')}
            {toggle('list', view, setView, 'List')}
          </div>
          {view === 'timeline' && (
            <div className="segmented" role="group" aria-label="Zoom">
              {toggle('year', zoom, setZoom, 'Years')}
              {toggle('quarter', zoom, setZoom, 'Quarters')}
            </div>
          )}
          <button className="btn btn-primary" onClick={() => setEditing({ story: null, area: areas[0] ?? 'career' })}>
            + New story
          </button>
        </div>
      </div>

      {error && (
        <div className="banner-error" role="alert">
          {error}{' '}
          <button className="link-btn" onClick={dismissError}>
            Dismiss
          </button>
        </div>
      )}

      {view === 'timeline' ? (
        <TimelineCanvas areas={areas} stories={stories} today={today} zoom={zoom} onZoom={setZoom} onOpen={(story) => setEditing({ story, area: story.life_area })} onAdd={(area) => setEditing({ story: null, area })} />
      ) : (
        <div className="story-list-view">
          {areas.map((area) => {
            const own = stories.filter((s) => s.life_area === area);
            return (
              <section key={area} aria-labelledby={`area-${area}`} className="story-area">
                <h2 className="section-title" id={`area-${area}`}>
                  {areaLabel(area)}
                </h2>
                {own.length > 0 && (
                  <ul className="story-list">
                    {own.map((s) => (
                      <li key={s.id}>
                        <button className={`story-row status-${s.status}`} onClick={() => setEditing({ story: s, area })}>
                          <span className="story-row-title">{s.title}</span>
                          <span className="micro">{STATUS_LABEL[s.status]}</span>
                          <span className="micro muted">
                            Since {formatShortDate(s.created)} {s.created.slice(0, 4)}
                            {s.when ? ` · pictured ${s.when.replace('-', ' ')}` : ''}
                          </span>
                          {s.why && <span className="small muted story-row-why">{s.why}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button className="chip-btn" onClick={() => setEditing({ story: null, area })}>
                  + {own.length ? 'Add a story' : 'Add your first story'}
                </button>
              </section>
            );
          })}
        </div>
      )}

      <form className="add-area" onSubmit={(e) => void addArea(e)}>
        <input className="filter-input" value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="Add a life area, e.g. Creativity" aria-label="New life area" maxLength={40} />
        <button className="btn" type="submit" disabled={!newArea.trim()}>
          Add area
        </button>
      </form>

      {editing && (
        <LifeStoryEditor
          key={editing.story?.id ?? `new-${editing.area}`}
          story={editing.story}
          initialArea={editing.area}
          areas={areas}
          entries={entries}
          today={today}
          onSave={(input) => run(() => window.paroh.horizons.save(input, editing.story?.id))}
          onDelete={editing.story ? () => run(() => window.paroh.horizons.remove(editing.story!.id)) : undefined}
          onClose={() => setEditing(null)}
          onOpenEntry={onOpenEntry}
        />
      )}
    </div>
  );
}
