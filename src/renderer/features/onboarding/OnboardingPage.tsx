import { useEffect, useState } from 'react';
import { SupportLine } from '../../components/SupportLine';
import { chooseVaultFolder } from '../../hooks/useVault';

interface Props {
  onDone: () => void;
}

/** First launch: what Paroh is, where the journal will live, and the privacy line, then straight into the app. */
export function OnboardingPage({ onDone }: Props) {
  const [path, setPath] = useState('');
  const mobile = window.paroh.platform === 'mobile';

  useEffect(() => {
    void window.paroh.vault.info().then((info) => setPath(info.path));
  }, []);

  async function choose() {
    const next = await chooseVaultFolder();
    if (next) setPath(next);
  }

  async function finish() {
    await window.paroh.settings.completeOnboarding();
    onDone();
  }

  return (
    <main className="onboarding">
      <div className="onboarding-card">
        <div className="brand">
          <span className="brand-name">Paroh</span>
        </div>
        <h1 className="onboarding-title">A quiet place to write, that stays yours.</h1>
        <p>Every day becomes one plain Markdown file in a folder on this {mobile ? 'phone' : 'computer'}. There is no account and no cloud. If you stop using Paroh, your journal is still right there.</p>
        <section className="onboarding-step" aria-labelledby="onb-folder">
          <h2 className="card-title" id="onb-folder">
            Where should your journal live?
          </h2>
          <code className="vault-path-full">{path || '…'}</code>
          {mobile ? (
            <p className="small muted">It’s in this phone’s Documents folder, so a sync app such as Syncthing can share it with your computer.</p>
          ) : (
            <div className="settings-actions">
              <button className="btn" onClick={() => void choose()}>
                Choose another folder
              </button>
            </div>
          )}
        </section>
        <SupportLine />
        <button className="btn btn-primary onboarding-start" onClick={() => void finish()} disabled={!path}>
          Start writing
        </button>
      </div>
    </main>
  );
}
