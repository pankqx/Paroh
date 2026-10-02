import { useState } from 'react';
import { PROMPT_CATEGORIES, categoryFor, type Prompt, type PromptCategory } from '../../../shared/types/Prompt';
import { formatShortDate } from '../../domain/dates';
import { daysOfUse, programPosition } from '../../domain/healingProgram';
import { usePromptHistory } from '../../hooks/usePromptHistory';
import { HealingPromptCard } from './HealingPromptCard';
import { writeAboutPrompt } from './promptActions';
import { PROMPT_LIBRARY } from './promptLibrary';

interface Props {
  today: string;
  entryDates: string[];
  onOpenEntry: (date: string) => void;
  onChanged: () => void;
}

const LABEL = Object.fromEntries(PROMPT_CATEGORIES.map((c) => [c.id, c.label])) as Record<PromptCategory, string>;

/** Browse the library, see the programme, pick any prompt for today, and review history (§5 Screen Layout). */
export function HealingPromptsPage({ today, entryDates, onOpenEntry, onChanged }: Props) {
  const { history, error: historyError } = usePromptHistory();
  const position = programPosition(daysOfUse(entryDates, today));
  const current = categoryFor(position.week);
  const [filter, setFilter] = useState<PromptCategory | 'all'>(current);
  const [error, setError] = useState<string | null>(null);

  const byId = new Map(PROMPT_LIBRARY.map((p) => [p.id, p]));
  const lastOutcome = new Map<string, { date: string; outcome: string }>();
  for (const h of [...history].reverse()) lastOutcome.set(h.prompt_id, h);

  const shown = PROMPT_LIBRARY.filter((p) => filter === 'all' || p.category === filter);
  const weeks = [...new Set(shown.map((p) => p.week_block))].sort((a, b) => a - b);

  async function pick(prompt: Prompt) {
    const result = await writeAboutPrompt(today, prompt);
    if (!result.ok) return setError(result.error);
    onChanged();
    onOpenEntry(today);
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Healing Prompts</h1>
        <span className="muted micro">
          Week {position.week} of 24 · {LABEL[current]}
        </span>
      </div>

      <div className="healing-top">
        <HealingPromptCard today={today} entryDates={entryDates} onOpenEntry={onOpenEntry} onChanged={onChanged} />
        <section className="card" aria-labelledby="programme-title">
          <h2 className="card-title" id="programme-title">
            The 24-week programme
          </h2>
          <p className="muted small">One week moves forward for every seven days you journal, so a quiet fortnight never costs you progress.</p>
          <ol className="programme">
            {PROMPT_CATEGORIES.map((c, i) => (
              <li key={c.id} className={c.id === current ? 'current' : ''} aria-current={c.id === current ? 'step' : undefined}>
                <span className="programme-weeks micro">
                  Weeks {i * 4 + 1}–{i * 4 + 4}
                </span>
                <span className="programme-label">{c.label}</span>
                <span className="micro muted">{c.skill}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <aside className="support-note" aria-label="About these prompts">
        These prompts draw on ideas from cognitive behavioural therapy to help you reflect. Paroh is a journal, not therapy, and it can’t tell you what you’re going through. If things feel heavy or you’re thinking about harming yourself, please talk to someone you trust or contact a local crisis line or a mental health professional.
      </aside>

      {(error || historyError) && (
        <div className="banner-error" role="alert">
          {error ?? historyError}
        </div>
      )}

      <section aria-labelledby="library-title" className="healing-section">
        <div className="page-head">
          <h2 className="section-title" id="library-title">
            Prompt library
          </h2>
          <label className="micro muted">
            Show{' '}
            <select value={filter} onChange={(e) => setFilter(e.target.value as PromptCategory | 'all')}>
              <option value="all">All weeks</option>
              {PROMPT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted small">Any prompt can be today’s prompt, including ones from later weeks. The programme is a suggested path, not a gate.</p>
        {weeks.map((week) => (
          <div key={week} className="prompt-week">
            <h3 className="prompt-week-title">
              Week {week} · {LABEL[categoryFor(week)]}
            </h3>
            <ul className="prompt-list">
              {shown
                .filter((p) => p.week_block === week)
                .map((p) => {
                  const last = lastOutcome.get(p.id);
                  return (
                    <li key={p.id} className="prompt-item">
                      <div>
                        <p className="prompt-item-text">{p.text}</p>
                        {p.followups?.map((f) => (
                          <p key={f} className="micro muted">
                            {f}
                          </p>
                        ))}
                        {last && (
                          <span className="micro muted">
                            {last.outcome === 'answered' ? 'Written about' : 'Skipped'} {formatShortDate(last.date)}
                          </span>
                        )}
                      </div>
                      <button className="btn" onClick={() => void pick(p)} aria-label={`Write about this today: ${p.text}`}>
                        Write about this today
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="history-title" className="healing-section">
        <h2 className="section-title" id="history-title">
          History
        </h2>
        {history.length === 0 ? (
          <p className="muted">Prompts you write about or skip will appear here.</p>
        ) : (
          <table className="prompt-history">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Prompt</th>
                <th scope="col">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.date}>
                  <td>
                    <button className="link-btn" onClick={() => onOpenEntry(h.date)}>
                      {formatShortDate(h.date)}
                    </button>
                  </td>
                  <td>{byId.get(h.prompt_id)?.text ?? h.prompt_id}</td>
                  <td>{h.outcome === 'answered' ? 'Written about' : 'Skipped'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
