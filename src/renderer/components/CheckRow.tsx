import type { ReactNode } from 'react';

interface Props {
  checked: boolean;
  label: string;
  onToggle: () => void;
  children?: ReactNode;
  disabled?: boolean;
}

/** A checklist row; the strike-through is decorative, state is carried by the real checkbox. */
export function CheckRow({ checked, label, onToggle, children, disabled }: Props) {
  return (
    <li className={`check-row ${checked ? 'checked' : ''}`}>
      <label className="check-label">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={onToggle} />
        <span className="check-text">{label}</span>
      </label>
      {children}
    </li>
  );
}
