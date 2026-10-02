import { useState } from 'react';
import { emptyEntry } from '../../../shared/types/Entry';
import type { Mood } from '../../../shared/types/Mood';
import { MoodSelector } from '../../components/MoodSelector';

interface Props {
  today: string;
  mood?: Mood;
  onSaved: () => void;
}

/** Writes the mood straight into today's entry frontmatter, creating the entry if needed. */
export function MoodCheckInCard({ today, mood, onSaved }: Props) {
  const [error, setError] = useState<string | null>(null);

  async function choose(next: Mood) {
    const loaded = await window.paroh.entries.load(today);
    if (!loaded.ok) return setError(loaded.error);
    const saved = await window.paroh.entries.save({ ...(loaded.value ?? emptyEntry(today)), mood: next });
    if (!saved.ok) return setError(saved.error);
    setError(null);
    onSaved();
  }

  return (
    <section className="card mood-card" aria-label="Mood check-in">
      <div className="eyebrow">How are you today?</div>
      <MoodSelector value={mood} onChange={(m) => void choose(m)} />
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}
