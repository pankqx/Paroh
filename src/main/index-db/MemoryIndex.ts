import type { DateRange, Entry, EntrySummary } from '../../shared/types/Entry';
import type { HabitDay } from '../../shared/types/Habit';
import type { PromptLog } from '../../shared/types/Prompt';
import { MATCH_END, MATCH_START, type Backlink, type SearchFilters, type SearchResult } from '../../shared/types/Search';
import { markdownToPlainText } from '../../shared/plainText';
import { extractWikilinkTargets, normalizeLinkTarget } from '../../shared/wikilinks';
import { toSummary } from '../vault/VaultAdapter';
import type { SearchIndex } from './SearchIndex';

interface Doc {
  entry: Entry;
  summary: EntrySummary;
  mtime: number;
  titleKey: string;
  plain: string;
  links: string[];
}

const WORD_RE = /[\p{L}\p{N}_']+/gu;
const words = (text: string) => (text.match(WORD_RE) ?? []).map((w) => w.toLowerCase());

/**
 * The mobile app's index: everything held in memory and rebuilt from the vault at launch. A phone's
 * journal is thousands of entries at most, so a scan per search stays fast. Matching is by word
 * prefix (so "pigeon" finds "pigeons", like the desktop's stemming), and every word must match.
 */
export class MemoryIndex implements SearchIndex {
  private docs = new Map<string, Doc>();
  private transcripts = new Map<string, { date: string; text: string }>();

  mtimes(): Map<string, number> {
    return new Map([...this.docs].map(([date, d]) => [date, d.mtime]));
  }

  upsert(entry: Entry, mtime: number): void {
    this.docs.set(entry.date, {
      entry,
      summary: toSummary(entry),
      mtime,
      titleKey: normalizeLinkTarget(entry.title),
      plain: markdownToPlainText(entry.body),
      links: extractWikilinkTargets(entry.body).map(normalizeLinkTarget),
    });
  }

  remove(date: string): void {
    this.docs.delete(date);
  }

  list(range?: DateRange): EntrySummary[] {
    return this.sorted()
      .filter((d) => !range || (d.entry.date >= range.from && d.entry.date <= range.to))
      .map((d) => d.summary);
  }

  habitHistory(): HabitDay[] {
    return this.sorted()
      .reverse()
      .filter((d) => d.entry.habits_snapshot?.length)
      .map((d) => ({ date: d.entry.date, habits: d.entry.habits_snapshot ?? [] }));
  }

  promptHistory(): PromptLog[] {
    return this.sorted()
      .filter((d) => d.entry.prompt_id)
      .map((d) => ({ prompt_id: d.entry.prompt_id!, date: d.entry.date, outcome: d.entry.prompt_skipped ? 'skipped' : 'answered' }));
  }

  tags(): { tag: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const d of this.docs.values()) for (const t of new Set(d.entry.tags.map((t) => t.toLowerCase()))) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  search(text: string, filters: SearchFilters = {}): SearchResult[] {
    const query = words(text);
    const candidates = this.sorted().filter((d) => passes(d.entry, filters));
    if (!query.length) return candidates.slice(0, 500).map((d) => ({ ...d.summary, snippet: d.summary.excerpt }));

    const scored: { doc: Doc; score: number; snippet: string }[] = [];
    for (const doc of candidates) {
      const fields = [words(doc.entry.title), words(doc.plain), words(doc.entry.tags.join(' '))];
      if (!query.every((q) => fields.some((f) => f.some((w) => w.startsWith(q))))) continue;
      const score = query.reduce((s, q) => s + 5 * count(fields[0], q) + count(fields[1], q) + 2 * count(fields[2], q), 0);
      scored.push({ doc, score, snippet: snippet(doc.plain, query) || snippet(doc.entry.title, query) });
    }
    scored.sort((a, b) => b.score - a.score || (a.doc.entry.date < b.doc.entry.date ? 1 : -1));
    const results: SearchResult[] = scored.slice(0, 200).map((s) => ({ ...s.doc.summary, snippet: s.snippet }));

    const seen = new Set(results.map((r) => r.date));
    for (const t of this.transcripts.values()) {
      const doc = this.docs.get(t.date);
      if (!doc || seen.has(t.date) || !passes(doc.entry, filters)) continue;
      const tw = words(t.text);
      if (!query.every((q) => tw.some((w) => w.startsWith(q)))) continue;
      seen.add(t.date);
      results.push({ ...doc.summary, snippet: `🎙 ${snippet(t.text, query)}` });
    }
    return results;
  }

  replaceTranscripts(rows: { id: string; date: string; text: string }[]): void {
    this.transcripts = new Map(rows.filter((r) => r.text.trim()).map((r) => [r.id, { date: r.date, text: r.text }]));
  }

  setTranscript(id: string, date: string, text: string): void {
    if (text.trim()) this.transcripts.set(id, { date, text });
    else this.transcripts.delete(id);
  }

  backlinks(date: string): Backlink[] {
    const target = this.docs.get(date);
    const keys = new Set([date, ...(target?.titleKey ? [target.titleKey] : [])]);
    return this.sorted()
      .filter((d) => d.entry.date !== date && d.links.some((l) => keys.has(l)))
      .map((d) => ({ date: d.entry.date, title: d.entry.title }));
  }

  resolveLink(target: string): string | null {
    const key = normalizeLinkTarget(target);
    if (this.docs.has(key)) return key;
    return this.sorted().find((d) => d.titleKey === key)?.entry.date ?? null;
  }

  close(): void {
    this.docs.clear();
    this.transcripts.clear();
  }

  /** Newest first. */
  private sorted(): Doc[] {
    return [...this.docs.values()].sort((a, b) => (a.entry.date < b.entry.date ? 1 : -1));
  }
}

function passes(entry: Entry, filters: SearchFilters): boolean {
  if (filters.mood && entry.mood !== filters.mood) return false;
  if (filters.range?.from && entry.date < filters.range.from) return false;
  if (filters.range?.to && entry.date > filters.range.to) return false;
  const tags = new Set(entry.tags.map((t) => t.toLowerCase()));
  return (filters.tags ?? []).every((t) => tags.has(t.toLowerCase()));
}

function count(field: string[], q: string): number {
  return field.filter((w) => w.startsWith(q)).length;
}

/** About 24 words around the first match, with matches marked the way the desktop's FTS5 snippets are. */
function snippet(text: string, query: string[]): string {
  const tokens = text.split(/(\s+)/);
  const isHit = (t: string) => words(t).some((w) => query.some((q) => w.startsWith(q)));
  const first = tokens.findIndex(isHit);
  if (first === -1) return '';
  const start = Math.max(0, first - 16);
  const end = Math.min(tokens.length, start + 48);
  const body = tokens
    .slice(start, end)
    .map((t) => (isHit(t) ? t.replace(WORD_RE, (w) => (query.some((q) => w.toLowerCase().startsWith(q)) ? `${MATCH_START}${w}${MATCH_END}` : w)) : t))
    .join('');
  return `${start > 0 ? '…' : ''}${body}${end < tokens.length ? '…' : ''}`;
}
