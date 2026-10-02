import { useCallback, useEffect, useState } from 'react';
import type { HabitInput } from '../../shared/ipc-contract';
import type { Habit, HabitDay } from '../../shared/types/Habit';
import type { Result } from '../../shared/types/Result';

export function useHabits(today: string) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [history, setHistory] = useState<HabitDay[]>([]);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback(([h, hist]: [Result<Habit[]>, Result<HabitDay[]>]) => {
    if (h.ok) setHabits(h.value);
    if (hist.ok) setHistory(hist.value);
    setError(!h.ok ? h.error : !hist.ok ? hist.error : null);
  }, []);

  const load = useCallback(() => Promise.all([window.paroh.habits.list(), window.paroh.habits.history()]).then(apply), [apply]);

  useEffect(() => {
    void Promise.all([window.paroh.habits.list(), window.paroh.habits.history()]).then(apply);
    return window.paroh.vault.onChanged(() => void load());
  }, [apply, load]);

  /** Runs a change, reloads, and surfaces a failure instead of swallowing it (§6 Errors). */
  const run = useCallback(
    async (action: () => Promise<Result<unknown>>) => {
      const result = await action();
      if (!result.ok) setError(result.error);
      await load();
      return result.ok;
    },
    [load],
  );

  const todayDone = new Set(history.find((d) => d.date === today)?.habits ?? []);

  return {
    habits,
    history,
    todayDone,
    error,
    dismissError: () => setError(null),
    toggle: (id: string) => run(() => window.paroh.habits.toggleToday(id)),
    create: (input: HabitInput) => run(() => window.paroh.habits.create(input)),
    update: (id: string, input: HabitInput) => run(() => window.paroh.habits.update(id, input)),
    setArchived: (id: string, archived: boolean) => run(() => window.paroh.habits.setArchived(id, archived)),
  };
}
