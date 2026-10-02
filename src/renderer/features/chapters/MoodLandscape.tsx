import { useState } from 'react';
import { MOODS } from '../../../shared/types/Mood';
import { MOOD_EMOJI } from '../../components/MoodSelector';
import { describeLandscape, monthRange, type ChapterSummary } from '../../domain/chapters';
import { formatShortDate } from '../../domain/dates';

const W = 720;
const H = 170;
const PAD = { left: 44, right: 12, top: 14, bottom: 28 };

/** A soft terrain through the month's moods; the drawn shape has a text equivalent (§11 Accessibility). */
export function MoodLandscape({ chapter }: { chapter: ChapterSummary }) {
  const [hover, setHover] = useState<{ date: string; label: string } | null>(null);
  const { to } = monthRange(chapter.month);
  const days = Number(to.slice(8));
  const x = (date: string) => PAD.left + ((Number(date.slice(8)) - 1) / Math.max(1, days - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + ((5 - v) / 4) * (H - PAD.top - PAD.bottom);
  const base = H - PAD.bottom;
  const pts = chapter.moodDays.map((d) => ({ ...d, x: x(d.date), y: y(d.value) }));
  const summary = describeLandscape(chapter.weeks);

  // Catmull-Rom through the logged days, so the terrain reads as one landscape rather than spikes.
  let line = '';
  if (pts.length === 1) line = `M${PAD.left},${pts[0].y} L${W - PAD.right},${pts[0].y}`;
  else if (pts.length > 1) {
    line = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: Math.min(base, Math.max(PAD.top, p1.y + (p2.y - p0.y) / 6)) };
      const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: Math.min(base, Math.max(PAD.top, p2.y - (p3.y - p1.y) / 6)) };
      line += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
    }
  }
  const startX = pts.length === 1 ? PAD.left : pts[0]?.x;
  const endX = pts.length === 1 ? W - PAD.right : pts[pts.length - 1]?.x;
  const area = line ? `${line} L${endX},${base} L${startX},${base} Z` : '';

  return (
    <section className="card landscape" aria-labelledby="landscape-title">
      <div className="card-head">
        <h2 className="card-title" id="landscape-title">
          Mood landscape
        </h2>
        <span className="micro muted" aria-live="polite">
          {hover ? hover.label : `${chapter.moodDays.length} ${chapter.moodDays.length === 1 ? 'day' : 'days'} with a mood`}
        </span>
      </div>
      {pts.length === 0 ? (
        <p className="muted small">No moods logged this month.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="landscape-svg" role="img" aria-label={summary}>
          <defs>
            <linearGradient id="terrain" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--mood-ok)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--mood-ok)" stopOpacity="0.08" />
            </linearGradient>
          </defs>
          {MOODS.map((m, i) => (
            <g key={m}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(i + 1)} y2={y(i + 1)} className="grid-line" />
              <text x={PAD.left - 10} y={y(i + 1) + 4} textAnchor="end" className="axis-label">
                {MOOD_EMOJI[m]}
              </text>
            </g>
          ))}
          {chapter.weeks.slice(1).map((w) => (
            <line key={w.from} x1={x(w.from) - 4} x2={x(w.from) - 4} y1={PAD.top} y2={base} className="chart-week" />
          ))}
          {chapter.weeks.map((w) => (
            <text key={w.from} x={(x(w.from) + x(w.to)) / 2} y={H - 8} textAnchor="middle" className="axis-label">
              Week {w.index}
            </text>
          ))}
          <g className="terrain">
            <path d={area} fill="url(#terrain)" />
            <path d={line} className="terrain-line" />
            {pts.map((p) => (
              <circle key={p.date} cx={p.x} cy={p.y} r={4.5} className={`mood-point fill-${p.mood}`} />
            ))}
          </g>
          {pts.map((p) => (
            <rect
              key={p.date}
              x={p.x - 10}
              y={PAD.top}
              width={20}
              height={base - PAD.top}
              fill="transparent"
              onMouseEnter={() => setHover({ date: p.date, label: `${formatShortDate(p.date)} · ${MOOD_EMOJI[p.mood]} ${p.mood}` })}
              onMouseLeave={() => setHover(null)}
            />
          ))}
          {hover && <line x1={x(hover.date)} x2={x(hover.date)} y1={PAD.top} y2={base} className="chart-crosshair" />}
        </svg>
      )}
    </section>
  );
}
