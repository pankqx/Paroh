import { formatLongDate } from '../domain/dates';

export function TopBar({ today, onNewEntry }: { today: string; onNewEntry: () => void }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-name">Paroh</span>
        <span className="brand-descriptor">Personal Operating System</span>
      </div>
      <div className="topbar-date">{formatLongDate(today)}</div>
      <button className="btn btn-primary" onClick={onNewEntry}>
        + Today's entry
      </button>
    </header>
  );
}
