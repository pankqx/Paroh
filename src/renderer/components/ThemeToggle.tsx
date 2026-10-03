import { Monitor, Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme, type ThemePreference } from '../app/theme';

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'Match system', Icon: Monitor },
];

/** Light, dark, or follow the device. A sliding thumb shows which one is on. */
export function ThemeToggle({ id = 'theme' }: { id?: string }) {
  const { preference, setPreference } = useTheme();
  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Theme">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button key={value} role="radio" aria-checked={preference === value} aria-label={label} title={label} className={`theme-opt ${preference === value ? 'on' : ''}`} onClick={() => setPreference(value)}>
          {preference === value && <motion.span layoutId={`${id}-thumb`} className="theme-thumb" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
          <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
