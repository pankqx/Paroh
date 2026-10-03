import { useCallback, useEffect, useState } from 'react';
import type { PlanEventInput, PlanGoalInput, PlannerData } from '../../../shared/types/Planner';
import type { Result } from '../../../shared/types/Result';

export function usePlanner() {
  const [data, setData] = useState<PlannerData>({ events: [], goals: [] });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await window.paroh.planner.list();
    if (r.ok) setData(r.value);
    else setError(r.error);
  }, []);

  useEffect(() => {
    void window.paroh.planner.list().then((r) => (r.ok ? setData(r.value) : setError(r.error)));
    return window.paroh.vault.onChanged((c) => c.reset && void load());
  }, [load]);

  const run = useCallback(
    async (action: () => Promise<Result<unknown>>) => {
      const r = await action();
      setError(r.ok ? null : r.error);
      await load();
      return r.ok;
    },
    [load],
  );

  return {
    ...data,
    error,
    dismissError: () => setError(null),
    saveEvent: (input: PlanEventInput, id?: string) => run(() => window.paroh.planner.saveEvent(input, id)),
    removeEvent: (id: string) => run(() => window.paroh.planner.removeEvent(id)),
    saveGoal: (input: PlanGoalInput, id?: string) => run(() => window.paroh.planner.saveGoal(input, id)),
    removeGoal: (id: string) => run(() => window.paroh.planner.removeGoal(id)),
  };
}
