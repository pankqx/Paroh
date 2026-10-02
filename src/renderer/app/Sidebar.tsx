import type { Navigate, View } from './App';

interface Props {
  view: View;
  today: string;
  vaultPath: string;
  onNavigate: Navigate;
  onChooseVault: () => void;
}

// Later-phase pages are listed so the shape of the app is visible, but stay disabled until they are real.
const LATER: string[] = [];

export function Sidebar({ view, today, vaultPath, onNavigate, onChooseVault }: Props) {
  const items: { label: string; active: boolean; go: View }[] = [
    { label: 'Canvas', active: view.name === 'canvas', go: { name: 'canvas' } },
    { label: 'Today’s entry', active: view.name === 'editor' && view.date === today, go: { name: 'editor', date: today } },
    { label: 'Calendar', active: view.name === 'calendar', go: { name: 'calendar' } },
    { label: 'All Entries', active: view.name === 'entries', go: { name: 'entries', query: '' } },
    { label: 'Audio Logs', active: view.name === 'audio', go: { name: 'audio' } },
    { label: 'Habits', active: view.name === 'habits', go: { name: 'habits' } },
    { label: 'To-Do', active: view.name === 'todo', go: { name: 'todo' } },
    { label: 'Healing Prompts', active: view.name === 'prompts', go: { name: 'prompts' } },
  ];
  return (
    <nav className="sidebar" aria-label="Main">
      <ul className="nav">
        {items.map((item) => (
          <li key={item.label}>
            <button className={`nav-item ${item.active ? 'active' : ''}`} aria-current={item.active ? 'page' : undefined} onClick={() => onNavigate(item.go)}>
              {item.label}
            </button>
          </li>
        ))}
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
