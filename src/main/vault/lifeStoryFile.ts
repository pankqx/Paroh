import { Document, isSeq, parse } from 'yaml';
import { CURRENT_SCHEMA_VERSION, isEntryDate } from '../../shared/types/Entry';
import { isPeriod, isStoryStatus, type LifeStory } from '../../shared/types/LifeStory';
import { err, ok, type Result } from '../../shared/types/Result';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const KNOWN_KEYS = new Set(['schema_version', 'title', 'life_area', 'status', 'created', 'when', 'linked_entries']);
const WHY_RE = /^##\s+Why\s*$/im;

export function serializeLifeStory(story: LifeStory): string {
  const data: Record<string, unknown> = {
    schema_version: story.schema_version,
    title: story.title,
    life_area: story.life_area,
    status: story.status,
    created: story.created,
  };
  if (story.when) data.when = story.when;
  data.linked_entries = story.linked_entries;
  for (const [k, v] of Object.entries(story.extra ?? {})) if (!KNOWN_KEYS.has(k)) data[k] = v;
  const doc = new Document(data);
  const seq = doc.get('linked_entries', true);
  if (isSeq(seq)) seq.flow = true;
  const yaml = doc.toString({ flowCollectionPadding: false }).trimEnd();
  const why = story.why.trim();
  return `---\n${yaml}\n---\n\n## Why\n\n${why ? `${why}\n` : ''}`;
}

/** `id`, `area` and `fallbackCreated` come from the file's place on disk and its timestamps. */
export function parseLifeStory(text: string, id: string, area: string, fallbackCreated: string): Result<LifeStory> {
  const match = FRONTMATTER_RE.exec(text);
  let data: Record<string, unknown> = {};
  let body = text;
  if (match) {
    try {
      const parsed: unknown = parse(match[1]) ?? {};
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return err('Frontmatter must be a YAML mapping');
      data = parsed as Record<string, unknown>;
    } catch (e) {
      return err(`Invalid YAML frontmatter: ${(e as Error).message}`);
    }
    body = match[2];
  }
  const dateOf = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v);
  const created = dateOf(data.created);
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (!KNOWN_KEYS.has(k)) extra[k] = v;
  const whyMatch = WHY_RE.exec(body);
  const why = (whyMatch ? body.slice(whyMatch.index + whyMatch[0].length) : body).trim();
  const when = typeof data.when === 'number' ? String(data.when) : data.when;

  return ok({
    id,
    schema_version: typeof data.schema_version === 'number' ? data.schema_version : CURRENT_SCHEMA_VERSION,
    title: typeof data.title === 'string' && data.title.trim() ? data.title : id.split('/')[1].replace(/-/g, ' '),
    life_area: area,
    status: isStoryStatus(data.status) ? data.status : 'dreaming',
    created: isEntryDate(created) ? created : fallbackCreated,
    ...(isPeriod(when) ? { when } : {}),
    linked_entries: Array.isArray(data.linked_entries) ? data.linked_entries.map(dateOf).filter(isEntryDate) : [],
    why,
    ...(Object.keys(extra).length ? { extra } : {}),
  });
}
