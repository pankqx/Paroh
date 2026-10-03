import { useState } from 'react';
import { SPEECH_MODEL } from '../../../shared/speechModel';
import type { SettingsView } from '../../../shared/ipc-contract';
import { formatMegabytes, useSpeechModel } from '../../hooks/useAiStatus';

/** The Anthropic API key for Editor's Note. The key goes to main once and never comes back. */
export function ApiKeyField({ settings, onChanged }: { settings: SettingsView; onChanged: () => void }) {
  const [key, setKey] = useState('');
  const [replacing, setReplacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(value: string | null) {
    const r = await window.paroh.ai.setApiKey(value);
    if (!r.ok) return setError(r.error);
    setError(null);
    setKey('');
    setReplacing(false);
    onChanged();
  }

  return (
    <div className="ai-details">
      {settings.hasApiKey && !replacing ? (
        <div className="settings-actions">
          <span className="small">Your Anthropic API key is saved{settings.apiKeyEncrypted ? ', encrypted with this computer’s keyring' : ''}.</span>
          <button className="btn" onClick={() => setReplacing(true)}>
            Replace key
          </button>
          <button className="btn" onClick={() => void save(null)}>
            Forget key
          </button>
        </div>
      ) : (
        <form
          className="settings-actions"
          onSubmit={(e) => {
            e.preventDefault();
            void save(key);
          }}
        >
          <label className="field inline-field">
            <span>Anthropic API key</span>
            <input className="filter-input api-key-input" type="password" autoComplete="off" spellCheck={false} placeholder="sk-ant-…" value={key} onChange={(e) => setKey(e.target.value)} />
          </label>
          <button className="btn btn-primary" type="submit" disabled={!key.trim()}>
            Save key
          </button>
          {replacing && (
            <button className="btn" type="button" onClick={() => setReplacing(false)}>
              Cancel
            </button>
          )}
        </form>
      )}
      <p className="micro muted">
        Get a key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a>. Anthropic bills that key directly; one note usually costs a few cents.
        {settings.hasApiKey && !settings.apiKeyEncrypted && ' This computer has no keyring, so the key is stored obscured rather than encrypted, readable only by your user account.'}
      </p>
      {error && (
        <p className="error-text small" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Download, progress and removal of the on-device speech model. */
export function SpeechModelPanel() {
  const status = useSpeechModel();
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setError(null);
    const r = await window.paroh.ai.model.download();
    if (!r.ok) setError(r.error);
  }

  async function remove() {
    const r = await window.paroh.ai.model.remove();
    if (!r.ok) setError(r.error);
  }

  return (
    <div className="ai-details" aria-live="polite">
      {status?.state === 'ready' && (
        <div className="settings-actions">
          <span className="small">Speech model ready ({formatMegabytes(status.bytes)}). Transcribe any recording from Audio Logs.</span>
          <button className="btn" onClick={() => void remove()}>
            Remove model
          </button>
        </div>
      )}
      {status?.state === 'downloading' && (
        <div className="model-progress">
          <span className="small">
            Downloading the speech model… {formatMegabytes(status.receivedBytes)} of about {SPEECH_MODEL.approxMegabytes} MB
          </span>
          <progress max={SPEECH_MODEL.approxMegabytes * 1_000_000} value={status.receivedBytes} aria-label="Speech model download" />
        </div>
      )}
      {(status?.state === 'missing' || status?.state === 'error') && (
        <div className="settings-actions">
          <button className="btn btn-primary" onClick={() => void download()}>
            Download speech model (about {SPEECH_MODEL.approxMegabytes} MB)
          </button>
          <span className="micro muted">Whisper base, from Hugging Face. Downloaded once, used offline.</span>
        </div>
      )}
      {(error ?? (status?.state === 'error' ? status.message : null)) && (
        <p className="error-text small" role="alert">
          {error ?? (status?.state === 'error' ? status.message : '')}
        </p>
      )}
    </div>
  );
}
