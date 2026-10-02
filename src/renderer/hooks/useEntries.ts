import { useCallback, useEffect, useState } from 'react';
import type { EntrySummary } from '../../shared/types/Entry';
import type { Result } from '../../shared/types/Result';

/** All entry summaries (from the index), refreshed whenever the vault changes on disk. */
export function useEntries() {
  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((result: Result<EntrySummary[]>) => {
    if (result.ok) {
      setEntries(result.value);
      setError(null);
    } else {
      setError(result.error);
    }
  }, []);

  const refresh = useCallback(() => window.paroh.entries.list().then(apply), [apply]);

  useEffect(() => {
    void window.paroh.entries.list().then(apply);
    return window.paroh.vault.onChanged(() => void window.paroh.entries.list().then(apply));
  }, [apply]);

  return { entries, error, refresh };
}
