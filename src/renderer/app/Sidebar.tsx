import { AudioLines, BookMarked, BookOpen, CalendarDays, Flame, FolderOpen, House, LayoutDashboard, ListChecks, Mountain, PenLine, Settings2, Sprout, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { BrandMark } from '../components/BrandMark';
import { ThemeToggle } from '../components/ThemeToggle';
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
  Icon: LucideIcon;
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
        { label: 'Home', Icon: House, active: is('canvas'), go: { name: 'canvas' } },
        { label: 'Today’s entry', Icon: PenLine, active: view.name === 'editor' && view.date === today, go: { name: 'editor', date: today } },
        { label: 'Healing Prompts', Icon: Sprout, active: is('prompts'), go: { name: 'prompts' } },
        { label: 'Habits', Icon: Flame, active: is('habits'), go: { name: 'habits' } },
        { label: 'To-Do', Icon: ListChecks, active: is('todo'), go: { name: 'todo' } },
        { label: 'Audio Logs', Icon: AudioLines, active: is('audio'), go: { name: 'audio' } },
      ],
    },
    {
      title: 'Reflect',
      items: [
        { label: 'Calendar', Icon: CalendarDays, active: is('calendar'), go: { name: 'calendar' } },
        { label: 'All Entries', Icon: BookOpen, active: is('entries'), go: { name: 'entries', query: '' } },
        { label: 'Chapters', Icon: BookMarked, active: is('chapters'), go: { name: 'chapters' } },
        { label: 'Horizons', Icon: Mountain, active: is('horizons'), go: { name: 'horizons' } },
      ],
    },
    {
      title: 'Create',
      items: [{ label: 'Boards', Icon: LayoutDashboard, active: is('boards'), go: { name: 'boards' } }],
    },
  ];
  return (
    <nav className="sidebar" aria-label="Main">
      <button className="sidebar-brand" onClick={() => onNavigate({ name: 'canvas' })} aria-label="Paroh, home">
        <BrandMark size={34} />
        <span className="sidebar-brand-text">
          <span className="sidebar-brand-name">Paroh</span>
          <span className="sidebar-brand-sub">Personal journal</span>
        </span>
      </button>
      {groups.map((group) => (
        <div key={group.title} className="nav-group">
          <h2 className="nav-group-title" id={`nav-${group.title}`}>
            {group.title}
          </h2>
          <ul className="nav" aria-labelledby={`nav-${group.title}`}>
            {group.items.map((item) => (
              <li key={item.label}>
                <NavButton item={item} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="sidebar-footer">
        <NavButton item={{ label: 'Settings', Icon: Settings2, active: is('settings'), go: { name: 'settings' } }} onNavigate={onNavigate} />
        <ThemeToggle id="sidebar-theme" />
        <div className="vault-card">
          <FolderOpen size={15} strokeWidth={1.8} aria-hidden="true" />
          <div className="vault-card-text">
            <div className="vault-label">Vault</div>
            <div className="vault-path" title={vaultPath}>
              {vaultPath || '…'}
            </div>
          </div>
          {window.paroh.platform === 'desktop' && (
            <button className="link-btn" onClick={onChooseVault}>
              Change
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavButton({ item, onNavigate }: { item: NavItem; onNavigate: Navigate }) {
  const { Icon } = item;
  return (
    <button className={`nav-item ${item.active ? 'active' : ''}`} aria-current={item.active ? 'page' : undefined} onClick={() => onNavigate(item.go)}>
      {item.active && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 480, damping: 38 }} />}
      <Icon className="nav-icon" size={17} strokeWidth={1.75} aria-hidden="true" />
      <span className="nav-label">{item.label}</span>
    </button>
  );
}
