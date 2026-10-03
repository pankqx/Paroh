import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import type { EntrySummary } from '../../../shared/types/Entry';
import type { PlanArea, PlanEvent } from '../../../shared/types/Planner';
import { shiftMonth } from '../../domain/planner';
import { useTasks } from '../../hooks/useTasks';
import { MonthView } from './MonthView';
import { PlanDialog } from './PlanDialog';
import { usePlanner } from './usePlanner';
import { YearView } from './YearView';

type Mode = 'month' | 'year';

interface Props {
  today: string;
  entries: EntrySummary[];
  onOpenEntry: (date: string) => void;
}

/** Monthly and yearly planners in one place: plans and goals of your own, with your tasks and pages woven in. */
export function PlannerPage({ today, entries, onOpenEntry }: Props) {
  const planner = usePlanner();
  const { tasks } = useTasks();
  const [mode, setMode] = useState<Mode>('month');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [focus, setFocus] = useState<PlanArea | null>(null);
  const [dialog, setDialog] = useState<{ date: string; event?: PlanEvent } | null>(null);
  const year = Number(month.slice(0, 4));
  const monthName = new Date(year, Number(month.slice(5)) - 1, 1).toLocaleDateString(undefined, { month: 'long' });

  const step = (by: number) => setMonth((m) => (mode === 'month' ? shiftMonth(m, by) : shiftMonth(m, by * 12)));

  return (
    <div className={`page planner-page mode-${mode}`}>
      <header className="planner-head">
        <div className="planner-title-block">
          <div className="eyebrow">{mode === 'month' ? 'Monthly planner' : 'Yearly planner'}</div>
          <div className="planner-title-row">
            <button className="icon-btn planner-step" aria-label={mode === 'month' ? 'Previous month' : 'Previous year'} onClick={() => step(-1)}>
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <AnimatePresence mode="wait" initial={false}>
              <motion.h1
                key={mode === 'month' ? month : year}
                className="planner-title"
                initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {mode === 'month' ? (
                  <>
                    <span className="planner-month">{monthName}</span> <span className="planner-year">{year}</span>
                  </>
                ) : (
                  <span className="planner-big-year">{year}</span>
                )}
              </motion.h1>
            </AnimatePresence>
            <button className="icon-btn planner-step" aria-label={mode === 'month' ? 'Next month' : 'Next year'} onClick={() => step(1)}>
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
          <p className="planner-tagline">{mode === 'month' ? 'Plan gently. Leave room for the days to surprise you.' : 'A whole year, held in one view.'}</p>
        </div>
        <div className="planner-actions">
          <button className="btn" onClick={() => setMonth(today.slice(0, 7))}>
            <CalendarDays size={15} aria-hidden="true" />
            Today
          </button>
          <div className="segmented" role="group" aria-label="View">
            <button className={`seg-btn ${mode === 'month' ? 'on' : ''}`} aria-pressed={mode === 'month'} onClick={() => setMode('month')}>
              Month
            </button>
            <button className={`seg-btn ${mode === 'year' ? 'on' : ''}`} aria-pressed={mode === 'year'} onClick={() => setMode('year')}>
              Year
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setDialog({ date: month === today.slice(0, 7) ? today : `${month}-01` })}>
            <Plus size={16} aria-hidden="true" />
            Add plan
          </button>
        </div>
      </header>

      {planner.error && (
        <div className="banner-error" role="alert">
          {planner.error}{' '}
          <button className="link-btn" onClick={planner.dismissError}>
            Dismiss
          </button>
        </div>
      )}

      {mode === 'month' ? (
        <MonthView
          month={month}
          today={today}
          events={planner.events}
          goals={planner.goals}
          tasks={tasks}
          entries={entries}
          focus={focus}
          onFocus={setFocus}
          onNewPlan={(date) => setDialog({ date })}
          onOpenPlan={(event) => setDialog({ date: event.start, event })}
          onOpenEntry={onOpenEntry}
          onSaveGoal={planner.saveGoal}
          onRemoveGoal={(id) => void planner.removeGoal(id)}
        />
      ) : (
        <YearView
          year={year}
          today={today}
          events={planner.events}
          goals={planner.goals}
          entries={entries}
          focus={focus}
          onOpenMonth={(m) => {
            setMonth(m);
            setMode('month');
          }}
          onOpenPlan={(event) => setDialog({ date: event.start, event })}
          onSaveGoal={planner.saveGoal}
          onRemoveGoal={(id) => void planner.removeGoal(id)}
        />
      )}

      <AnimatePresence>
        {dialog && (
          <PlanDialog
            key={dialog.event?.id ?? dialog.date}
            event={dialog.event}
            date={dialog.date}
            onClose={() => setDialog(null)}
            onSave={(input) => planner.saveEvent(input, dialog.event?.id)}
            onRemove={
              dialog.event
                ? () => {
                    void planner.removeEvent(dialog.event!.id);
                    setDialog(null);
                  }
                : undefined
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
