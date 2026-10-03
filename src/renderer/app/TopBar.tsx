import { formatLongDate } from '../domain/dates';

interface Props {
  today: string;
  query: string;
  navOpen: boolean;
  onMenu: () => void;
  onSearch: (query: string) => void;
  onNewEntry: () => void;
}

export function TopBar({ today, query, navOpen, onMenu, onSearch, onNewEntry }: Props) {
  return (
    <header className="topbar">
      {/* Only shown on narrow screens, where the sidebar becomes a drawer. */}
      <button className="menu-btn icon-btn" aria-label="Menu" aria-expanded={navOpen} onClick={onMenu}>
        ☰
      </button>
      <div className="brand">
        <span className="brand-name">Paroh</span>
        <span className="brand-descriptor">Personal Operating System</span>
      </div>
      <div className="topbar-date">{formatLongDate(today)}</div>
      <div className="topbar-actions">
        <input
          className="search-input"
          type="search"
          placeholder="Search entries…"
          aria-label="Search entries"
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={() => onSearch(query)}
        />
        <button className="btn btn-primary" onClick={onNewEntry}>
          <span aria-hidden="true">+</span>
          <span className="new-entry-label"> Today's entry</span>
        </button>
      </div>
    </header>
  );
}
