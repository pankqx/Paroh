import type { View } from './App';

interface Props {
  view: View;
  today: string;
  vaultPath: string;
  onCanvas: () => void;
  onToday: () => void;
  onChooseVault: () => void;
}

// Later-phase pages are listed so the shape of the app is visible, but stay disabled until they are real.
const LATER = ['Calendar', 'All Entries', 'Audio Logs', 'Habits', 'To-Do', 'Healing Prompts'];

export function Sidebar({ view, today, vaultPath, onCanvas, onToday, onChooseVault }: Props) {
  const editingToday = view.name === 'editor' && view.date === today;
  return (
    <nav className="sidebar" aria-label="Main">
      <ul className="nav">
        <li>
          <button className={`nav-item ${view.name === 'canvas' ? 'active' : ''}`} onClick={onCanvas}>
            Canvas
          </button>
        </li>
        <li>
          <button className={`nav-item ${editingToday ? 'active' : ''}`} onClick={onToday}>
            Today's entry
          </button>
        </li>
        {LATER.map((label) => (
          <li key={label}>
            <button className="nav-item" disabled title="Coming in a later phase">
              {label}
              <span className="soon">soon</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        <div className="vault-label">Vault</div>
        <div className="vault-path" title={vaultPath}>
          {vaultPath || '…'}
        </div>
        <button className="link-btn" onClick={onChooseVault}>
          Change folder
        </button>
      </div>
    </nav>
  );
}
