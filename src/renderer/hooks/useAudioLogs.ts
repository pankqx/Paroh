import { useCallback, useEffect, useState } from 'react';
import type { AudioLog } from '../../shared/types/AudioLog';
import type { Result } from '../../shared/types/Result';
import { useRecorder } from '../app/RecorderContext';

export function useAudioLogs() {
  const [logs, setLogs] = useState<AudioLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { savedCount } = useRecorder();

  const apply = useCallback((r: Result<AudioLog[]>) => (r.ok ? setLogs(r.value) : setError(r.error)), []);
  const load = useCallback(() => window.paroh.audio.list().then(apply), [apply]);

  useEffect(() => {
    void window.paroh.audio.list().then(apply);
  }, [apply, savedCount]);

  const rename = useCallback(
    async (id: string, title: string) => {
      const r = await window.paroh.audio.rename(id, title);
      if (!r.ok) setError(r.error);
      await load();
    },
    [load],
  );

  return { logs, error, rename };
}
