import type { Navigate, View } from './App';

interface Props {
  view: View;
  today: string;
  vaultPath: string;
  onNavigate: Navigate;
  onChooseVault: () => void;
}

interface NavItem {
  label: string;
  active: boolean;
  go: View;
}

/** Two groups, "Today" and "Reflect" (decisions.md), so the daily tools and the long views don't crowd one list. */
export function Sidebar({ view, today, vaultPath, onNavigate, onChooseVault }: Props) {
  const is = (name: View['name']) => view.name === name;
  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: 'Today',
      items: [
        { label: 'Canvas', active: is('canvas'), go: { name: 'canvas' } },
        { label: 'Today’s entry', active: view.name === 'editor' && view.date === today, go: { name: 'editor', date: today } },
        { label: 'Healing Prompts', active: is('prompts'), go: { name: 'prompts' } },
        { label: 'Habits', active: is('habits'), go: { name: 'habits' } },
        { label: 'To-Do', active: is('todo'), go: { name: 'todo' } },
        { label: 'Audio Logs', active: is('audio'), go: { name: 'audio' } },
      ],
    },
    {
      title: 'Reflect',
      items: [
        { label: 'Calendar', active: is('calendar'), go: { name: 'calendar' } },
        { label: 'All Entries', active: is('entries'), go: { name: 'entries', query: '' } },
        { label: 'Chapters', active: is('chapters'), go: { name: 'chapters' } },
        { label: 'Horizons', active: is('horizons'), go: { name: 'horizons' } },
      ],
    },
  ];
  return (
    <nav className="sidebar" aria-label="Main">
      {groups.map((group) => (
        <div key={group.title} className="nav-group">
          <h2 className="nav-group-title" id={`nav-${group.title}`}>
            {group.title}
          </h2>
          <ul className="nav" aria-labelledby={`nav-${group.title}`}>
            {group.items.map((item) => (
              <li key={item.label}>
                <button className={`nav-item ${item.active ? 'active' : ''}`} aria-current={item.active ? 'page' : undefined} onClick={() => onNavigate(item.go)}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
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
