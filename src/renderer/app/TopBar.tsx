import { formatLongDate } from '../domain/dates';

interface Props {
  today: string;
  query: string;
  onSearch: (query: string) => void;
  onNewEntry: () => void;
}

export function TopBar({ today, query, onSearch, onNewEntry }: Props) {
  return (
    <header className="topbar">
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
          + Today's entry
        </button>
      </div>
    </header>
  );
}
