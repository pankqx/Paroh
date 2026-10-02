import { formatShortDate } from '../../domain/dates';
import { heatmapWeeks } from '../../domain/streak';

interface Props {
  name: string;
  done: Set<string>;
  scheduled: (date: string) => boolean;
  today: string;
  weeks?: number;
}

/** GitHub-contributions style: one square per day, filled when done. Each square has its own tooltip. */
export function HabitHeatmap({ name, done, scheduled, today, weeks = 20 }: Props) {
  const grid = heatmapWeeks(today, weeks);
  return (
    <div className="heatmap" role="img" aria-label={`${name}: done on ${[...done].filter((d) => d >= grid[0][0]).length} of the last ${weeks} weeks’ days`}>
      {grid.map((week) => (
        <div key={week[0]} className="heatmap-col">
          {week.map((date) => {
            const state = date > today ? 'future' : done.has(date) ? 'done' : scheduled(date) ? 'missed' : 'off';
            return <span key={date} className={`heat heat-${state}`} title={`${formatShortDate(date)}: ${state === 'done' ? 'done' : state === 'off' ? 'not scheduled' : state === 'future' ? '' : 'not done'}`} />;
          })}
        </div>
      ))}
    </div>
  );
}
