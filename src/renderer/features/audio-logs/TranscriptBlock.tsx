import { useState } from 'react';
import type { AudioLog } from '../../../shared/types/AudioLog';
import type { TranscribeProgress } from '../transcription/protocol';
import { transcribeRecording } from '../transcription/transcribe';

interface Props {
  log: AudioLog;
  /** Transcription switched on and the speech model downloaded. */
  canTranscribe: boolean;
  onSaved: () => void;
}

function progressLabel(p: TranscribeProgress): string {
  if (p.stage === 'decoding') return 'Preparing the recording…';
  if (p.stage === 'loading') return `Loading the speech model… ${p.percent}%`;
  return 'Transcribing on this computer…';
}

/** A recording's transcript, or the button that makes one on-device. Recordings are never transcribed unasked (§8). */
export function TranscriptBlock({ log, canTranscribe, onSaved }: Props) {
  const [progress, setProgress] = useState<TranscribeProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function transcribe() {
    setError(null);
    setProgress({ stage: 'decoding' });
    const r = await transcribeRecording(log.id, setProgress);
    setProgress(null);
    if (!r.ok) return setError(r.error);
    const saved = await window.paroh.audio.setTranscript(log.id, r.value);
    if (!saved.ok) return setError(saved.error);
    onSaved();
  }

  async function remove() {
    const r = await window.paroh.audio.setTranscript(log.id, '');
    if (!r.ok) return setError(r.error);
    onSaved();
  }

  return (
    <div className="transcript">
      {log.transcript ? (
        <details>
          <summary className="small">Transcript</summary>
          <p className="transcript-text">{log.transcript}</p>
          <button className="link-btn micro" onClick={() => void remove()}>
            Remove transcript
          </button>
        </details>
      ) : progress ? (
        <span className="micro muted" role="status">
          {progressLabel(progress)}
        </span>
      ) : (
        canTranscribe && (
          <button className="btn btn-small" onClick={() => void transcribe()} aria-label={`Transcribe ${log.title}`}>
            Transcribe
          </button>
        )
      )}
      {error && (
        <p className="error-text micro" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
