import { useEffect, useState } from 'react';
import { AI_FEATURES } from '../../../shared/aiFeatures';
import type { SettingsView } from '../../../shared/ipc-contract';
import { SupportLine } from '../../components/SupportLine';
import { chooseVaultFolder } from '../../hooks/useVault';
import { ApiKeyField, SpeechModelPanel } from './AiFeatureDetails';

interface Props {
  onVaultChanged: () => void;
}

type Status = { kind: 'idle' } | { kind: 'busy'; label: string } | { kind: 'done'; message: string } | { kind: 'error'; message: string };

/** Vault, AI features, reminder, export/import, privacy and about (feature-specifications.md §12). */
export function SettingsPage({ onVaultChanged }: Props) {
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [reminder, setReminder] = useState('');

  const load = () =>
    window.paroh.settings.get().then((s) => {
      setSettings(s);
      setReminder(s.reminderTime ?? '');
    });

  useEffect(() => {
    void window.paroh.settings.get().then((s) => {
      setSettings(s);
      setReminder(s.reminderTime ?? '');
    });
    // Progress can arrive after the export's result, so it only ever updates a running export.
    return window.paroh.vault.onExportProgress(({ done, total }) => setStatus((s) => (s.kind === 'busy' ? { kind: 'busy', label: `Exporting… ${done} of ${total} files` } : s)));
  }, []);

  async function changeVault() {
    if (await chooseVaultFolder()) {
      await load();
      onVaultChanged();
    }
  }

  async function exportVault() {
    setStatus({ kind: 'busy', label: 'Exporting…' });
    const r = await window.paroh.vault.export();
    if (!r.ok) return setStatus({ kind: 'error', message: r.error });
    if (!r.value) return setStatus({ kind: 'idle' });
    setStatus({ kind: 'done', message: `Exported ${r.value.files} ${r.value.files === 1 ? 'file' : 'files'} to ${r.value.path}.` });
  }

  async function importVault() {
    setStatus({ kind: 'busy', label: 'Importing…' });
    const r = await window.paroh.vault.import();
    if (!r.ok) return setStatus({ kind: 'error', message: r.error });
    if (!r.value) return setStatus({ kind: 'idle' });
    setStatus({ kind: 'done', message: `Imported ${r.value.files} files. Paroh is now using ${r.value.path}.` });
    await load();
    onVaultChanged();
  }

  async function saveReminder(time: string | null) {
    const r = await window.paroh.settings.setReminder(time);
    if (!r.ok) return setStatus({ kind: 'error', message: r.error });
    await load();
    setStatus({ kind: 'done', message: time ? `A gentle reminder will appear at ${time} each day.` : 'Daily reminder turned off.' });
  }

  async function toggleAi(id: string, on: boolean) {
    const r = await window.paroh.settings.setAiFeature(id, on);
    if (!r.ok) setStatus({ kind: 'error', message: r.error });
    await load();
  }

  return (
    <div className="page settings">
      <div className="page-head">
        <h1 className="page-title">Settings</h1>
      </div>

      {status.kind !== 'idle' && (
        <div className={status.kind === 'error' ? 'banner-error' : 'banner-info'} role={status.kind === 'error' ? 'alert' : 'status'}>
          {status.kind === 'busy' ? status.label : status.message}
        </div>
      )}

      <section className="card settings-section" aria-labelledby="set-vault">
        <h2 className="card-title" id="set-vault">
          Vault
        </h2>
        <p className="small muted">Your journal is a folder of plain Markdown files. You can open it in any editor, back it up, or sync it with tools you already trust.</p>
        <code className="vault-path-full">{settings?.vaultPath ?? '…'}</code>
        <div className="settings-actions">
          <button className="btn" onClick={() => void window.paroh.vault.reveal()}>
            Show folder
          </button>
          <button className="btn" onClick={() => void changeVault()}>
            Change folder
          </button>
        </div>
      </section>

      <section className="card settings-section" aria-labelledby="set-export">
        <h2 className="card-title" id="set-export">
          Export and import
        </h2>
        <p className="small muted">Export makes one .zip of every entry, recording, story and setting in your vault. Import unpacks an export into an empty folder and switches to it.</p>
        <div className="settings-actions">
          <button className="btn btn-primary" onClick={() => void exportVault()} disabled={status.kind === 'busy'}>
            Export vault as .zip
          </button>
          <button className="btn" onClick={() => void importVault()} disabled={status.kind === 'busy'}>
            Import an export…
          </button>
        </div>
      </section>

      <section className="card settings-section" aria-labelledby="set-reminder">
        <h2 className="card-title" id="set-reminder">
          Daily reminder
        </h2>
        <p className="small muted">One quiet notification a day. It never mentions missed days.</p>
        <div className="settings-actions">
          <label className="field inline-field">
            <span>Time</span>
            <input className="filter-input" type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} />
          </label>
          <button className="btn" onClick={() => void saveReminder(reminder || null)} disabled={reminder === (settings?.reminderTime ?? '')}>
            Save
          </button>
          {settings?.reminderTime && (
            <button className="btn" onClick={() => void saveReminder(null)}>
              Turn off
            </button>
          )}
        </div>
      </section>

      <section className="card settings-section" aria-labelledby="set-ai">
        <h2 className="card-title" id="set-ai">
          AI features
        </h2>
        <p className="small muted">Every AI feature is off until you switch it on, one at a time. Paroh works fully without any of them.</p>
        <ul className="ai-list">
          {AI_FEATURES.map((f) => {
            const on = settings?.aiFeatures[f.id] === true;
            return (
              <li key={f.id} className="ai-row">
                <label className="switch-label">
                  <input type="checkbox" role="switch" checked={on} onChange={(e) => void toggleAi(f.id, e.target.checked)} aria-describedby={`ai-${f.id}-desc`} />
                  <span className="ai-name">{f.label}</span>
                </label>
                <p className="small muted" id={`ai-${f.id}-desc`}>
                  {f.leavesDevice}
                </p>
                {on && settings && f.id === 'editors-note' && <ApiKeyField settings={settings} onChanged={() => void load()} />}
                {on && f.id === 'transcription' && <SpeechModelPanel />}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="settings-section" aria-labelledby="set-privacy">
        <h2 className="section-title" id="set-privacy">
          Privacy and support
        </h2>
        <SupportLine />
      </section>

      <section className="card settings-section" aria-labelledby="set-about">
        <h2 className="card-title" id="set-about">
          About
        </h2>
        <p className="small">Paroh {settings?.version ?? ''}, an offline-first journal. Your files, your folder, your pace.</p>
      </section>
    </div>
  );
}
