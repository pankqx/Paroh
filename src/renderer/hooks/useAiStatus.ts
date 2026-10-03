import { useEffect, useState } from 'react';
import type { AiFeatureId } from '../../shared/aiFeatures';
import type { SpeechModelStatus } from '../../shared/speechModel';

/** Whether an AI feature is switched on, read when the page opens. Main checks again on every request. */
export function useAiFeature(id: AiFeatureId): boolean | null {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void window.paroh.settings.get().then((s) => {
      if (!cancelled) setOn(s.aiFeatures[id] === true);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);
  return on;
}

/** The speech model's state, kept live while a download runs. */
export function useSpeechModel(): SpeechModelStatus | null {
  const [status, setStatus] = useState<SpeechModelStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    void window.paroh.ai.model.status().then((s) => {
      if (!cancelled) setStatus(s);
    });
    const off = window.paroh.ai.model.onChanged(setStatus);
    return () => {
      cancelled = true;
      off();
    };
  }, []);
  return status;
}

export function formatMegabytes(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1_000_000))} MB`;
}
