import { Document, isSeq, parse } from 'yaml';
import { CURRENT_SCHEMA_VERSION, isEntryDate, type Entry } from '../../shared/types/Entry';
import { isMood } from '../../shared/types/Mood';
import { err, ok, type Result } from '../../shared/types/Result';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const KNOWN_KEYS = new Set(['schema_version', 'date', 'title', 'mood', 'tags', 'visibility', 'habits_snapshot', 'audio']);

export function serializeEntry(entry: Entry): string {
  const data: Record<string, unknown> = {
    schema_version: entry.schema_version,
    date: entry.date,
    title: entry.title,
  };
  if (entry.mood) data.mood = entry.mood;
  data.tags = entry.tags;
  data.visibility = entry.visibility;
  if (entry.habits_snapshot?.length) data.habits_snapshot = entry.habits_snapshot;
  if (entry.audio?.length) data.audio = entry.audio;
  // Keys written by a newer app version or by hand are carried through untouched.
  for (const [k, v] of Object.entries(entry.extra ?? {})) if (!KNOWN_KEYS.has(k)) data[k] = v;

  const doc = new Document(data);
  // `tags: [a, b]` on one line, matching the documented format and staying readable in other editors.
  for (const key of ['tags', 'habits_snapshot', 'audio']) {
    const seq = doc.get(key, true);
    if (isSeq(seq)) seq.flow = true;
  }
  const yaml = doc.toString({ flowCollectionPadding: false }).trimEnd();
  const body = entry.body.endsWith('\n') || entry.body === '' ? entry.body : `${entry.body}\n`;
  return `---\n${yaml}\n---\n\n${body}`;
}

/** `fallbackDate` is the filename's date, used when an older or hand-written file has no `date` key. */
export function parseEntry(text: string, fallbackDate: string): Result<Entry> {
  const match = FRONTMATTER_RE.exec(text);
  // A plain Markdown file with no frontmatter is still a valid entry (e.g. created in another editor).
  if (!match) return ok({ schema_version: CURRENT_SCHEMA_VERSION, date: fallbackDate, title: '', tags: [], visibility: 'private', body: text });

  let data: unknown;
  try {
    data = parse(match[1]) ?? {};
  } catch (e) {
    return err(`Invalid YAML frontmatter: ${(e as Error).message}`);
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return err('Frontmatter must be a YAML mapping');
  const d = data as Record<string, unknown>;

  const rawDate = d.date instanceof Date ? d.date.toISOString().slice(0, 10) : d.date;
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) if (!KNOWN_KEYS.has(k)) extra[k] = v;

  return ok({
    schema_version: typeof d.schema_version === 'number' ? d.schema_version : CURRENT_SCHEMA_VERSION,
    date: isEntryDate(rawDate) ? rawDate : fallbackDate,
    title: typeof d.title === 'string' ? d.title : d.title == null ? '' : String(d.title),
    mood: isMood(d.mood) ? d.mood : undefined,
    tags: Array.isArray(d.tags) ? d.tags.filter((t): t is string => typeof t === 'string') : [],
    visibility: d.visibility === 'public' ? 'public' : 'private',
    ...(stringList(d.habits_snapshot) ? { habits_snapshot: stringList(d.habits_snapshot) } : {}),
    ...(stringList(d.audio) ? { audio: stringList(d.audio) } : {}),
    body: match[2].replace(/^\r?\n/, ''),
    ...(Object.keys(extra).length ? { extra } : {}),
  });
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value.filter((v): v is string => typeof v === 'string');
  return list.length ? list : undefined;
}
