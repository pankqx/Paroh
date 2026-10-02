import { useCallback, useEffect, useState } from 'react';
import type { HorizonsData } from '../../shared/types/LifeStory';
import type { Result } from '../../shared/types/Result';

export function useHorizons() {
  const [data, setData] = useState<HorizonsData>({ areas: [], stories: [] });
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((r: Result<HorizonsData>) => {
    if (r.ok) setData(r.value);
    setError(r.ok ? null : r.error);
  }, []);

  const load = useCallback(() => window.paroh.horizons.list().then(apply), [apply]);

  useEffect(() => {
    void window.paroh.horizons.list().then(apply);
    return window.paroh.vault.onChanged((change) => change.reset && void load());
  }, [apply, load]);

  /** Runs a change, reloads, and keeps the error visible rather than swallowing it. */
  const run = useCallback(
    async <T,>(action: () => Promise<Result<T>>): Promise<Result<T>> => {
      const result = await action();
      if (!result.ok) setError(result.error);
      await load();
      return result;
    },
    [load],
  );

  return { ...data, error, dismissError: () => setError(null), run };
}
