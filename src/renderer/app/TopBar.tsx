import { Menu, Plus, Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { BrandMark } from '../components/BrandMark';

interface Props {
  query: string;
  navOpen: boolean;
  onMenu: () => void;
  onSearch: (query: string) => void;
  onNewEntry: () => void;
}

export function TopBar({ query, navOpen, onMenu, onSearch, onNewEntry }: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  // Ctrl/Cmd+K focuses search from anywhere (ui-rules.md §9).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

  return (
    <header className="topbar">
      {/* Only shown on narrow screens, where the sidebar becomes a drawer. */}
      <button className="menu-btn icon-btn" aria-label="Menu" aria-expanded={navOpen} onClick={onMenu}>
        <Menu size={20} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <div className="brand">
        <BrandMark size={28} />
        <span className="brand-name">Paroh</span>
      </div>
      <div className="topbar-actions">
        <label className="search-box">
          <Search size={16} strokeWidth={1.8} aria-hidden="true" />
          <input
            ref={searchRef}
            className="search-input"
            type="search"
            placeholder="Search your journal"
            aria-label="Search entries"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={() => onSearch(query)}
          />
          <kbd className="kbd" aria-hidden="true">
            {isMac ? '⌘' : 'Ctrl'} K
          </kbd>
        </label>
        <button className="btn btn-primary" aria-label="Today’s entry" onClick={onNewEntry}>
          <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
          <span className="new-entry-label">Today’s entry</span>
        </button>
      </div>
    </header>
  );
}
