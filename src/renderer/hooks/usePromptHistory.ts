import { useCallback, useEffect, useState } from 'react';
import type { PromptLog } from '../../shared/types/Prompt';
import type { Result } from '../../shared/types/Result';

export function usePromptHistory() {
  const [history, setHistory] = useState<PromptLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((result: Result<PromptLog[]>) => {
    if (result.ok) setHistory(result.value);
    setError(result.ok ? null : result.error);
  }, []);

  const load = useCallback(() => window.paroh.prompts.history().then(apply), [apply]);

  useEffect(() => {
    void window.paroh.prompts.history().then(apply);
    return window.paroh.vault.onChanged(() => void load());
  }, [apply, load]);

  return { history, error, reload: load };
}
