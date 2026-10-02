import { formatDuration, useRecorder } from '../../app/RecorderContext';
import { AudioPlayer } from '../../components/AudioPlayer';
import { formatShortDate } from '../../domain/dates';
import { useAudioLogs } from '../../hooks/useAudioLogs';

export function AudioLogsCard({ onOpenPage }: { onOpenPage: () => void }) {
  const { logs } = useAudioLogs();
  const { recording, toggle } = useRecorder();
  return (
    <section className="card daily-card" aria-label="Audio logs">
      <div className="card-head">
        <h3 className="card-title">Audio Logs</h3>
        <button className={`btn ${recording ? 'btn-accent' : 'btn-record'}`} onClick={toggle} title="Ctrl/Cmd+Shift+R from anywhere">
          {recording ? '■ Stop' : '● Record'}
        </button>
      </div>
      {logs.length === 0 ? (
        <p className="muted small">When writing feels like too much, just talk.</p>
      ) : (
        <ul className="audio-list">
          {logs.slice(0, 3).map((log) => (
            <li key={log.id} className="audio-row">
              <AudioPlayer log={log} />
              <div className="audio-meta">
                <div className="audio-title">{log.title}</div>
                <div className="micro muted">
                  {log.linkedEntryDate ? formatShortDate(log.linkedEntryDate) : ''} · {formatDuration(log.durationSeconds)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button className="link-btn card-foot" onClick={onOpenPage}>
        All recordings →
      </button>
    </section>
  );
}
