import { useEffect, useState } from 'react';
import { MOODS, type Mood } from '../../../shared/types/Mood';
import { MATCH_END, MATCH_START, type SearchResult } from '../../../shared/types/Search';
import { MOOD_EMOJI } from '../../components/MoodSelector';
import { formatLongDate } from '../../domain/dates';

interface Props {
  query: string;
  onQuery: (query: string) => void;
  onOpenEntry: (date: string) => void;
}

export function AllEntriesPage({ query, onQuery, onOpenEntry }: Props) {
  const [mood, setMood] = useState<Mood | ''>('');
  const [tag, setTag] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [state, setState] = useState<{ results: SearchResult[]; error: string | null; forQuery: string } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    void window.paroh.search.tags().then((r) => r.ok && setTags(r.value));
    return window.paroh.vault.onChanged(() => setVersion((v) => v + 1));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void window.paroh.search.query(query, { mood: mood || undefined, tags: tag ? [tag] : undefined, range: { from: from || undefined, to: to || undefined } }).then((r) => {
        if (cancelled) return;
        setState(r.ok ? { results: r.value, error: null, forQuery: query } : { results: [], error: r.error, forQuery: query });
      });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, mood, tag, from, to, version]);

  const filtered = Boolean(query || mood || tag || from || to);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">All Entries</h1>
        {state && <span className="muted micro">{state.results.length} shown</span>}
      </div>
      <div className="filters" role="search">
        <input className="filter-input grow" type="search" placeholder="Search words, titles or tags" aria-label="Search" value={query} onChange={(e) => onQuery(e.target.value)} autoFocus />
        <select className="filter-input" aria-label="Mood" value={mood} onChange={(e) => setMood(e.target.value as Mood | '')}>
          <option value="">Any mood</option>
          {MOODS.map((m) => (
            <option key={m} value={m}>
              {MOOD_EMOJI[m]} {m}
            </option>
          ))}
        </select>
        <select className="filter-input" aria-label="Tag" value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">Any tag</option>
          {tags.map((t) => (
            <option key={t.tag} value={t.tag}>
              {t.tag} ({t.count})
            </option>
          ))}
        </select>
        <label className="filter-date">
          <span className="micro muted">From</span>
          <input className="filter-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="filter-date">
          <span className="micro muted">To</span>
          <input className="filter-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      {state?.error && <div className="banner-error">{state.error}</div>}
      {state && state.results.length === 0 && !state.error && (
        <div className="card empty-card">
          <p className="muted">{filtered ? 'Nothing matches that yet.' : 'No entries yet. Your journal will show up here as you write.'}</p>
        </div>
      )}
      <ul className="results">
        {state?.results.map((r) => (
          <li key={r.date}>
            <button className="card result" onClick={() => onOpenEntry(r.date)}>
              <div className="result-head">
                <span className="entry-card-title">{r.title || 'Untitled'}</span>
                <span className="micro muted">
                  {r.mood && <span aria-label={`Mood: ${r.mood}`}>{MOOD_EMOJI[r.mood]} </span>}
                  {formatLongDate(r.date)}
                </span>
              </div>
              {r.snippet && <p className="result-snippet">{highlight(r.snippet)}</p>}
              {r.tags.length > 0 && (
                <div className="tags">
                  {r.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function highlight(snippet: string) {
  const parts = snippet.split(MATCH_START);
  return parts.map((part, i) => {
    if (i === 0) return <span key={i}>{part}</span>;
    const [match, rest = ''] = part.split(MATCH_END);
    return (
      <span key={i}>
        <mark>{match}</mark>
        {rest}
      </span>
    );
  });
}
