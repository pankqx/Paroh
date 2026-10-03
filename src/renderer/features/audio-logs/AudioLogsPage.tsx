import { Mic, Square } from 'lucide-react';
import { useState } from 'react';
import { formatDuration, useRecorder } from '../../app/RecorderContext';
import { AudioPlayer } from '../../components/AudioPlayer';
import { formatLongDate } from '../../domain/dates';
import { useAiFeature, useSpeechModel } from '../../hooks/useAiStatus';
import { useAudioLogs } from '../../hooks/useAudioLogs';
import { TranscriptBlock } from './TranscriptBlock';

export function AudioLogsPage({ onOpenEntry }: { onOpenEntry: (date: string) => void }) {
  const { logs, error, rename, reload } = useAudioLogs();
  const transcriptionOn = useAiFeature('transcription') === true;
  const model = useSpeechModel();
  const canTranscribe = transcriptionOn && model?.state === 'ready';
  const { recording, seconds, toggle } = useRecorder();
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Audio Logs</h1>
        <div className="page-head-actions">
          {window.paroh.platform === 'desktop' && <span className="micro muted">Ctrl/Cmd+Shift+R records from anywhere</span>}
          <button className={`btn ${recording ? 'btn-accent' : 'btn-record'}`} onClick={toggle}>
            {recording ? <Square size={13} fill="currentColor" aria-hidden="true" /> : <Mic size={15} aria-hidden="true" />}
            {recording ? `Stop (${formatDuration(seconds)})` : 'Record'}
          </button>
        </div>
      </div>
      {error && <div className="banner-error">{error}</div>}
      {logs.length === 0 && <p className="muted">No recordings yet. Press Record and just talk; it’s saved as you go.</p>}
      <ul className="results">
        {logs.map((log) => (
          <li key={log.id} className="card audio-page-row">
            <div className="audio-page-head">
              {editing?.id === log.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void rename(log.id, editing.title).then(() => setEditing(null));
                  }}
                >
                  <input className="filter-input" autoFocus aria-label="Recording name" value={editing.title} onChange={(e) => setEditing({ id: log.id, title: e.target.value })} onBlur={() => setEditing(null)} />
                </form>
              ) : (
                <button className="audio-title link-plain" title="Rename" onClick={() => setEditing({ id: log.id, title: log.title })}>
                  {log.title}
                </button>
              )}
              <span className="micro muted">
                {formatDuration(log.durationSeconds)}
                {log.linkedEntryDate && (
                  <>
                    {' · '}
                    <button className="link-btn" onClick={() => onOpenEntry(log.linkedEntryDate!)}>
                      {formatLongDate(log.linkedEntryDate)}
                    </button>
                  </>
                )}
              </span>
            </div>
            <AudioPlayer log={log} />
            <TranscriptBlock log={log} canTranscribe={canTranscribe} onSaved={() => void reload()} />
          </li>
        ))}
      </ul>
    </div>
  );
}
