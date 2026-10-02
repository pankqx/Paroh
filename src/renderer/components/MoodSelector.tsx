import { MOODS, type Mood } from '../../shared/types/Mood';

export const MOOD_EMOJI: Record<Mood, string> = { low: '😫', sad: '😔', meh: '😐', ok: '🙂', good: '😊' };
const LABEL: Record<Mood, string> = { low: 'Low', sad: 'Sad', meh: 'Meh', ok: 'Ok', good: 'Good' };

export function MoodSelector({ value, onChange }: { value?: Mood; onChange: (mood: Mood) => void }) {
  return (
    <div className="mood-selector" role="radiogroup" aria-label="Mood">
      {MOODS.map((m) => (
        <button key={m} role="radio" aria-checked={value === m} className={`mood ${value === m ? 'selected' : ''}`} onClick={() => onChange(m)}>
          <span className="mood-emoji" aria-hidden>
            {MOOD_EMOJI[m]}
          </span>
          <span className="mood-label">{LABEL[m]}</span>
        </button>
      ))}
    </div>
  );
}
