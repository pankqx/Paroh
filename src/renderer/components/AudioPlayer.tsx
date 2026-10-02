import { useEffect, useRef, useState } from 'react';
import type { AudioLog } from '../../shared/types/AudioLog';

/** Loads the recording from the vault only when asked to play, then plays inline with native controls. */
export function AudioPlayer({ log }: { log: AudioLog }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  async function load() {
    const r = await window.paroh.audio.read(log.id);
    if (!r.ok) return setError(r.error);
    setUrl(URL.createObjectURL(new Blob([r.value as BlobPart], { type: 'audio/webm' })));
  }

  useEffect(() => {
    if (url) void audio.current?.play().catch(() => {});
  }, [url]);

  if (error) return <span className="error-text">{error}</span>;
  if (!url)
    return (
      <button className="play-btn" aria-label={`Play ${log.title}`} onClick={() => void load()}>
        ▶
      </button>
    );
  return <audio ref={audio} className="audio-el" src={url} controls aria-label={log.title} />;
}
