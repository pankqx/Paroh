import { useState } from 'react';
import type { EntrySummary } from '../../../shared/types/Entry';
import { MOODS } from '../../../shared/types/Mood';
import { MOOD_EMOJI } from '../../components/MoodSelector';
import { addDays, formatShortDate } from '../../domain/dates';
import { moodTrend, type MoodPoint } from '../../domain/moodTrend';

const W = 720;
const H = 150;
const PAD = { left: 36, right: 12, top: 12, bottom: 24 };

/** Mood over the last 30 days: one line, gaps where no mood was logged, hover for the day. */
export function MoodTrendChart({ entries, today, days = 30 }: { entries: EntrySummary[]; today: string; days?: number }) {
  const points = moodTrend(entries, today, days);
  const [hover, setHover] = useState<MoodPoint | null>(null);
  const from = addDays(today, -(days - 1));
  const dayIndex = (date: string) => Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000);
  const x = (date: string) => PAD.left + (dayIndex(date) / (days - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + ((5 - v) / 4) * (H - PAD.top - PAD.bottom);

  // Break the line where consecutive points are more than one day apart, so missing days read as gaps.
  const segments: MoodPoint[][] = [];
  for (const p of points) {
    const last = segments[segments.length - 1];
    if (last && dayIndex(p.date) - dayIndex(last[last.length - 1].date) === 1) last.push(p);
    else segments.push([p]);
  }

  return (
    <section className="card mood-chart" aria-label={`Mood over the last ${days} days`}>
      <div className="card-head">
        <h2 className="card-title">Mood, last {days} days</h2>
        <span className="micro muted">{hover ? `${formatShortDate(hover.date)} · ${MOOD_EMOJI[hover.mood]} ${hover.mood}` : `${points.length} days logged`}</span>
      </div>
      {points.length === 0 ? (
        <p className="muted small">Log a mood on the Canvas or in an entry and it will show up here.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="mood-svg" role="img" aria-label={points.map((p) => `${p.date}: ${p.mood}`).join(', ')}>
          {MOODS.map((m, i) => (
            <g key={m}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(i + 1)} y2={y(i + 1)} className="grid-line" />
              <text x={PAD.left - 8} y={y(i + 1) + 4} textAnchor="end" className="axis-label">
                {MOOD_EMOJI[m]}
              </text>
            </g>
          ))}
          <text x={PAD.left} y={H - 6} className="axis-label">
            {formatShortDate(from)}
          </text>
          <text x={W - PAD.right} y={H - 6} textAnchor="end" className="axis-label">
            Today
          </text>
          {segments.map((seg) =>
            seg.length > 1 ? <polyline key={seg[0].date} className="mood-line" points={seg.map((p) => `${x(p.date)},${y(p.value)}`).join(' ')} /> : null,
          )}
          {points.map((p) => (
            <g key={p.date} onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)}>
              <circle cx={x(p.date)} cy={y(p.value)} r={12} className="hit" />
              <circle cx={x(p.date)} cy={y(p.value)} r={hover?.date === p.date ? 6 : 4.5} className={`mood-point fill-${p.mood}`} />
            </g>
          ))}
        </svg>
      )}
    </section>
  );
}
