import { useState, type KeyboardEvent } from 'react';
import { PROMPT_CATEGORIES } from '../../../shared/types/Prompt';
import type { Result } from '../../../shared/types/Result';
import { todaysPrompt } from '../../domain/healingProgram';
import { usePromptHistory } from '../../hooks/usePromptHistory';
import { skipPrompt, writeAboutPrompt } from './promptActions';
import { PROMPT_LIBRARY } from './promptLibrary';

interface Props {
  today: string;
  entryDates: string[];
  onOpenEntry: (date: string) => void;
  onChanged: () => void;
  onOpenPage?: () => void;
}

/** The dark prompt card on the Canvas (feature-specifications.md §5). `W` writes, `S` skips while it has focus. */
export function HealingPromptCard({ today, entryDates, onOpenEntry, onChanged, onOpenPage }: Props) {
  const { history, reload } = usePromptHistory();
  const [error, setError] = useState<string | null>(null);
  const { prompt, status, position } = todaysPrompt(PROMPT_LIBRARY, entryDates, history, today);
  const category = PROMPT_CATEGORIES.find((c) => c.id === prompt.category)?.label ?? prompt.category;

  async function run(action: Promise<Result<unknown>>, open: boolean) {
    const result = await action;
    if (!result.ok) return setError(result.error);
    setError(null);
    await reload();
    onChanged();
    if (open) onOpenEntry(today);
  }
  const write = () => void run(writeAboutPrompt(today, prompt), true);
  const skip = () => void run(skipPrompt(today, prompt), false);

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.target !== e.currentTarget || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      write();
    } else if ((e.key === 's' || e.key === 'S') && status === 'open') {
      e.preventDefault();
      skip();
    }
  }

  return (
    <section className="card prompt-card" aria-label="Healing prompt" tabIndex={0} onKeyDown={onKeyDown} aria-keyshortcuts="W S">
      <div className="eyebrow">
        Healing prompt · {category} · Week {position.week}
      </div>
      {position.cycle > 0 && position.week === 1 && status === 'open' && (
        <p className="prompt-note">You’ve completed the full 24 weeks. The programme starts again from the beginning, at your pace.</p>
      )}
      <p className="prompt-text">{prompt.text}</p>
      {status === 'open' && (
        <div className="prompt-actions">
          <button className="btn btn-light" onClick={write}>
            Write about it
          </button>
          <button className="btn btn-ghost-light" onClick={skip}>
            Skip
          </button>
        </div>
      )}
      {status === 'answered' && (
        <div className="prompt-actions">
          <span className="prompt-status">You wrote about this today.</span>
          <button className="btn btn-ghost-light" onClick={() => onOpenEntry(today)}>
            Open entry
          </button>
        </div>
      )}
      {status === 'skipped' && (
        <div className="prompt-actions">
          <span className="prompt-status">Skipped. A new prompt arrives tomorrow.</span>
          <button className="link-btn link-light" onClick={write}>
            Write about it anyway
          </button>
        </div>
      )}
      {onOpenPage && (
        <button className="link-btn link-light prompt-more" onClick={onOpenPage}>
          All prompts →
        </button>
      )}
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}
