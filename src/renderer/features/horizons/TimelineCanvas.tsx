import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { addDays } from '../../../shared/localDate';
import { areaLabel, STORY_STATUSES, type LifeStory } from '../../../shared/types/LifeStory';
import { assignLanes, storySpan, timelineColumns, timelineFraction, timelineYears, type Zoom } from '../../domain/horizons';
import { PHONE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';

const LABEL_W_WIDE = 150;
// On a phone the area labels give up width to the timeline itself.
const LABEL_W_PHONE = 120;
const COL_W: Record<Zoom, number> = { year: 240, quarter: 150 };
const MIN_BAND = 150;
const LANE_H = 52;
const STATUS_LABEL = Object.fromEntries(STORY_STATUSES.map((s) => [s.id, s.label]));

interface Props {
  areas: string[];
  stories: LifeStory[];
  today: string;
  zoom: Zoom;
  onZoom: (zoom: Zoom) => void;
  onOpen: (story: LifeStory) => void;
  onAdd: (area: string) => void;
}

/** Years run left to right, life areas top to bottom (§10). Native scrolling gives the momentum; the list view is the accessible twin. */
export function TimelineCanvas({ areas, stories, today, zoom, onZoom, onOpen, onAdd }: Props) {
  const LABEL_W = useMediaQuery(PHONE_QUERY) ? LABEL_W_PHONE : LABEL_W_WIDE;
  const ref = useRef<HTMLDivElement>(null);
  const years = timelineYears(stories, today);
  const cols = timelineColumns(years, zoom);
  const colW = COL_W[zoom];
  const total = cols.length * colW;
  const px = (date: string) => timelineFraction(date, years) * total;
  const todayX = px(today);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = Math.max(0, LABEL_W + todayX - el.clientWidth / 3);
  }, [zoom, todayX, LABEL_W]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      el.scrollBy({ left: e.key === 'ArrowLeft' ? -colW : colW });
    } else if (e.key === '+' || e.key === '=') onZoom('quarter');
    else if (e.key === '-' || e.key === '_') onZoom('year');
  }

  return (
    <div className="timeline" ref={ref} role="region" aria-label="Life timeline. Arrow keys move through time, plus and minus zoom." tabIndex={0} onKeyDown={onKeyDown}>
      <div className="timeline-inner" style={{ width: LABEL_W + total }}>
        <div className="timeline-header" aria-hidden="true">
          <div className="timeline-corner" style={{ width: LABEL_W }} />
          {cols.map((c) => (
            <div key={c.key} className={`timeline-col ${c.from <= today && today <= c.to ? 'now' : ''}`} style={{ width: colW }}>
              {c.label}
            </div>
          ))}
        </div>
        {areas.map((area) => {
          const own = stories.filter((s) => s.life_area === area);
          const bands = own.map((s) => {
            const span = storySpan(s, today);
            const left = px(span.from);
            const width = Math.max(MIN_BAND, px(addDays(span.to, 1)) - left);
            return { story: s, left, width };
          });
          const lanes = assignLanes(bands.map((b) => ({ left: b.left, right: b.left + b.width + 8 })));
          const laneCount = Math.max(1, ...lanes.map((l) => l + 1));
          return (
            <div key={area} className="timeline-row">
              <div className="timeline-label" style={{ width: LABEL_W }}>
                <span title={areaLabel(area)}>{areaLabel(area)}</span>
                <button className="icon-btn small" aria-label={`Add a story to ${areaLabel(area)}`} onClick={() => onAdd(area)}>
                  +
                </button>
              </div>
              <div className="timeline-track" style={{ width: total, height: laneCount * LANE_H + 12, backgroundSize: `${colW}px 100%` }}>
                {bands.map((b, i) => (
                  <button
                    key={b.story.id}
                    className={`story-band status-${b.story.status}`}
                    style={{ left: b.left, width: b.width, top: 6 + lanes[i] * LANE_H }}
                    onClick={() => onOpen(b.story)}
                    title={b.story.why || b.story.title}
                  >
                    {/* Sticky, so the title stays readable when the band's start is scrolled behind the area labels. */}
                    <span className="story-band-text" style={{ left: LABEL_W + 8 }}>
                      <span className="story-band-title">{b.story.title}</span>
                      <span className="story-band-status">{STATUS_LABEL[b.story.status]}</span>
                    </span>
                  </button>
                ))}
                {own.length === 0 && (
                  <button className="timeline-add" style={{ left: todayX + 12 }} onClick={() => onAdd(area)}>
                    + Add your first story
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div className="timeline-today" style={{ left: LABEL_W + todayX }} aria-hidden="true">
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
