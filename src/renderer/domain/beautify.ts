import { addDays, weekday } from '../../shared/localDate';

/**
 * "Make it beautiful": tidies a page the way a careful friend with a pen would, entirely on this
 * device. No model, no network: a set of small, predictable rules, so the same page always comes
 * out the same way and nothing the person wrote is ever reworded, only punctuated and arranged.
 */
export interface PlannedTask {
  text: string;
  /** YYYY-MM-DD, when the sentence said when. */
  due?: string;
  /** The words that said when ("tomorrow", "on Friday"), for showing next to the task. */
  when?: string;
}

export interface BeautifyResult {
  title: string;
  body: string;
  tasks: PlannedTask[];
  grateful: string[];
  /** Plain-language notes on what changed, for the confirmation line. */
  changes: string[];
}

const PLAN_HEADING = '## Plan';
const GRATEFUL_HEADING = '## Grateful for';
const GENERATED = new Set([PLAN_HEADING, GRATEFUL_HEADING]);

const CONTRACTIONS: Record<string, string> = {
  im: 'I’m',
  ive: 'I’ve',
  id: 'I’d',
  dont: 'don’t',
  doesnt: 'doesn’t',
  didnt: 'didn’t',
  cant: 'can’t',
  wont: 'won’t',
  isnt: 'isn’t',
  wasnt: 'wasn’t',
  arent: 'aren’t',
  werent: 'weren’t',
  couldnt: 'couldn’t',
  shouldnt: 'shouldn’t',
  wouldnt: 'wouldn’t',
  havent: 'haven’t',
  hasnt: 'hasn’t',
  youre: 'you’re',
  theyre: 'they’re',
  thats: 'that’s',
  theres: 'there’s',
  whats: 'what’s',
  lets: 'let’s',
};

const TASK_RE = /^(?:i\s+(?:really\s+)?(?:need|have|want|plan|ought)\s+to|i\s+(?:must|should)|(?:need|have|got)\s+to|remember\s+to|don[’']?t\s+forget\s+to|must|todo:?|to\s*do:?|task:?)\s+(.+)$/i;
const GRATEFUL_RE = /\b(?:grateful|thankful)\s+(?:for|that)\s+(.+)$/i;
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WHEN_RE = new RegExp(`\\b(today|tonight|tomorrow|this weekend|next week|(?:on |by |this |next )?(?:${DAYS.join('|')}))\\b`, 'i');

/** Code, media, tables and HTML are left exactly as they are. */
function isProtected(block: string): boolean {
  const first = block.trimStart();
  return first.startsWith('```') || first.startsWith('![') || first.startsWith('|') || first.startsWith('<') || first.startsWith('    ');
}

const LIST_LINE_RE = /^\s*(?:[-*+•·–]|\d+[.)])\s+/;
const CHECK_LINE_RE = /^\s*(?:[-*+•]\s*)?\[( |x|X)?\]\s*/;

export function beautify(input: { title: string; body: string; date: string }): BeautifyResult {
  const changes = new Counter();
  const tasks: PlannedTask[] = [];
  // Tasks already written as a checklist are offered for the To-Do list but not repeated under Plan.
  const listed = new Set<PlannedTask>();
  const grateful: string[] = [];
  const blocks = splitBlocks(stripGenerated(input.body));
  const out: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (isProtected(block)) {
      out.push(block);
      continue;
    }
    const lines = block.split('\n').map((l) => l.replace(/\s+$/, ''));

    // Already-structured Markdown: tidy the words, keep the structure.
    if (/^#{1,6}\s/.test(lines[0]) && lines.length === 1) {
      out.push(lines[0].replace(/^(#{1,6})\s+(.*)$/, (_m, h: string, t: string) => `${h} ${capitalize(stripEndPunct(cleanText(t, changes)))}`));
      continue;
    }
    if (lines.every((l) => /^\s*>/.test(l))) {
      out.push(lines.map((l) => l.replace(/^(\s*>\s?)(.*)$/, (_m, q: string, t: string) => q + tidySentences(t, changes))).join('\n'));
      continue;
    }

    // Checklists and lists, whether typed as Markdown or loosely ("• milk", "[] call mum").
    if (lines.length >= 1 && lines.every((l) => CHECK_LINE_RE.test(l))) {
      out.push(
        lines
          .map((l) => {
            const done = /\[(x|X)\]/.test(l);
            const text = capitalize(stripEndPunct(cleanText(l.replace(CHECK_LINE_RE, ''), changes)));
            if (!done) {
              const task = withWhen(text, input.date);
              tasks.push(task);
              listed.add(task);
            }
            return `- [${done ? 'x' : ' '}] ${text}`;
          })
          .join('\n'),
      );
      if (!lines.every((l) => /^- \[[ x]\] /.test(l))) changes.add('checklist');
      continue;
    }
    if (lines.length >= 2 && lines.every((l) => LIST_LINE_RE.test(l))) {
      const ordered = lines.every((l) => /^\s*\d+[.)]\s/.test(l));
      out.push(lines.map((l, n) => `${ordered ? `${n + 1}.` : '-'} ${capitalize(cleanText(l.replace(LIST_LINE_RE, ''), changes))}`).join('\n'));
      if (lines.some((l) => !/^(?:-|\d+\.) /.test(l))) changes.add('list');
      continue;
    }

    // A short line ending in a colon, or a short line on its own before more writing, is a heading.
    const single = lines.length === 1 ? lines[0].trim() : '';
    const words = single.split(/\s+/).filter(Boolean).length;
    const nextIsProse = i + 1 < blocks.length && !isProtected(blocks[i + 1]);
    if (single && words <= 6 && (/:$/.test(single) || (nextIsProse && !/[.!?…,;]$/.test(single) && i > 0))) {
      out.push(`## ${capitalize(stripEndPunct(cleanText(single, changes)))}`);
      changes.add('heading');
      continue;
    }

    // Prose: tidy each sentence, gather plans and gratitude, and give long stretches some air.
    const text = tidySentences(lines.join(' '), changes);
    for (const s of sentences(text)) {
      const plain = s.replace(/[*_~`]/g, '').trim();
      const task = clauses(plain).map((c) => TASK_RE.exec(c)).find(Boolean);
      if (task) tasks.push(withWhen(capitalize(stripEndPunct(task[1])), input.date));
      const thanks = GRATEFUL_RE.exec(plain);
      if (thanks) grateful.push(capitalize(stripEndPunct(thanks[1])));
    }
    const paragraphs = splitLong(text);
    if (paragraphs.length > 1) changes.add('paragraph', paragraphs.length - 1);
    out.push(...paragraphs);
  }

  const uniqueTasks = dedupe(tasks, (t) => t.text.toLowerCase());
  const uniqueThanks = dedupe(grateful, (t) => t.toLowerCase());
  const openTasks = uniqueTasks.filter((t) => !out.some((b) => b.includes(`- [x] ${t.text}`)));
  const toPlan = openTasks.filter((t) => !listed.has(t));
  if (toPlan.length) {
    out.push(PLAN_HEADING, toPlan.map((t) => `- [ ] ${t.text}${t.when ? ` · *${t.when}*` : ''}`).join('\n'));
  }
  if (uniqueThanks.length) out.push(GRATEFUL_HEADING, uniqueThanks.map((g) => `- ${g}`).join('\n'));

  let title = input.title.trim();
  if (!title) {
    title = suggestTitle(out.filter((b) => !b.startsWith('#') && !isProtected(b)).join(' '));
    if (title) changes.add('title');
  } else {
    const tidy = capitalize(stripEndPunct(cleanText(title, changes)));
    title = tidy;
  }

  return { title, body: out.join('\n\n') + (out.length ? '\n' : ''), tasks: openTasks, grateful: uniqueThanks, changes: changes.describe(openTasks.length, uniqueThanks.length) };
}

/** Removes the Plan / Grateful sections a previous run added, so running it twice changes nothing. */
function stripGenerated(body: string): string {
  const blocks = splitBlocks(body);
  const keep: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (GENERATED.has(blocks[i].trim()) && i + 1 < blocks.length && /^- /.test(blocks[i + 1])) {
      i++;
      continue;
    }
    keep.push(blocks[i]);
  }
  return keep.join('\n\n');
}

/** The sentence, then what follows each "and", "but", "so" or ";" in it ("…was long and I need to…"). */
function clauses(sentence: string): string[] {
  const out = [sentence];
  for (const m of sentence.matchAll(/(?:,\s*|\s+)(?:and|but|so|then)\s+|;\s*/gi)) out.push(sentence.slice(m.index + m[0].length));
  return out;
}

function splitBlocks(body: string): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  let fence = false;
  for (const line of body.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*```/.test(line)) fence = !fence;
    if (!fence && line.trim() === '' && !/^\s*```/.test(line)) {
      if (current.length) blocks.push(current.join('\n'));
      current = [];
      continue;
    }
    if (fence) {
      current.push(line);
      continue;
    }
    // "• milk • eggs" typed on one line becomes one item per line.
    const items = /^\s*[•·]\s/.test(line) ? line.split(/\s+[•·]\s+/) : [line];
    for (const [n, raw] of items.entries()) {
      const item = n === 0 ? raw : `• ${raw}`;
      // A list starting or ending mid-paragraph gets a block of its own.
      const isItem = LIST_LINE_RE.test(item) || CHECK_LINE_RE.test(item);
      const prev = current[current.length - 1];
      if (prev !== undefined && isItem !== (LIST_LINE_RE.test(prev) || CHECK_LINE_RE.test(prev)) && !/^\s*(?:>|#|\|)/.test(prev)) {
        blocks.push(current.join('\n'));
        current = [];
      }
      current.push(item);
    }
  }
  if (current.length) blocks.push(current.join('\n'));
  return blocks;
}

/** Spacing, contractions, "i" → "I", ellipses; never changes a word's meaning. */
function cleanText(text: string, changes: Counter): string {
  let t = text.replace(/[ \t]+/g, ' ').trim();
  const before = t;
  t = t
    .replace(/\s+([,.;:!?])(?=[A-Za-z])/g, '$1 ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,;])(?=[A-Za-z])/g, '$1 ')
    .replace(/([.!?])(?=[A-Z][a-z])/g, '$1 ')
    .replace(/\.{3,}/g, '…')
    .replace(/([!?]){2,}/g, '$1')
    .replace(/(^|[\s(“"])i(?=[\s,.!?;:’']|$)/g, '$1I')
    .replace(/(^|\s)i[’']([a-z]+)/g, (_m, s: string, rest: string) => `${s}I’${rest}`)
    .replace(/\b([A-Za-z]+)\b/g, (w) => {
      const fixed = CONTRACTIONS[w.toLowerCase()];
      if (!fixed || w.toLowerCase() === 'id' || w.toLowerCase() === 'lets') return w;
      return w[0] === w[0].toUpperCase() ? capitalize(fixed) : fixed;
    });
  if (t !== before) changes.add('tidy');
  return t;
}

function tidySentences(text: string, changes: Counter): string {
  const cleaned = cleanText(text, changes);
  let capitalized = 0;
  const parts = sentences(cleaned).map((s) => {
    const c = capitalize(s);
    if (c !== s) capitalized++;
    return c;
  });
  if (capitalized) changes.add('capital', capitalized);
  let joined = parts.join(' ');
  if (/[\p{L}\p{N})”"’]$/u.test(joined) && !/^#/.test(joined)) {
    joined += '.';
    changes.add('stop');
  }
  return joined;
}

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+(?=[\p{L}“"‘(*_])/u).filter(Boolean);
}

/** About three sentences per paragraph once a paragraph runs past ~90 words. */
function splitLong(text: string): string[] {
  if (text.split(/\s+/).length <= 90) return [text];
  const s = sentences(text);
  const out: string[] = [];
  for (let i = 0; i < s.length; i += 3) out.push(s.slice(i, i + 3).join(' '));
  return out;
}

function capitalize(s: string): string {
  const m = /^([\s*_“"‘(]*)(\p{Ll})/u.exec(s);
  return m ? s.slice(0, m[1].length) + m[2].toUpperCase() + s.slice(m[1].length + 1) : s;
}

function stripEndPunct(s: string): string {
  return s.replace(/[\s.,;:!?…]+$/, '');
}

function withWhen(text: string, date: string): PlannedTask {
  const m = WHEN_RE.exec(text);
  if (!m) return { text };
  const phrase = m[1].toLowerCase();
  const due = resolveWhen(phrase, date);
  // "Call mum tomorrow" → task "Call mum", due tomorrow.
  const bare = stripEndPunct(text.replace(m[0], '').replace(/\s{2,}/g, ' ').replace(/\s+(?:on|by)\s*$/i, ''));
  const when = capitalize(phrase.replace(new RegExp(`\\b(${DAYS.join('|')})\\b`), (d) => capitalize(d)));
  return { text: capitalize(bare || text), ...(due ? { due } : {}), when };
}

function resolveWhen(phrase: string, date: string): string | undefined {
  if (phrase === 'today' || phrase === 'tonight') return date;
  if (phrase === 'tomorrow') return addDays(date, 1);
  if (phrase === 'next week') return addDays(date, 7 - ((weekday(date) + 6) % 7));
  if (phrase === 'this weekend') return addDays(date, (6 - weekday(date) + 7) % 7);
  const day = DAYS.findIndex((d) => phrase.endsWith(d));
  if (day < 0) return undefined;
  let diff = (day - weekday(date) + 7) % 7;
  if (diff === 0) diff = 7;
  if (phrase.startsWith('next ')) diff += diff < 7 ? 7 : 0;
  return addDays(date, diff);
}

/** The first sentence's opening words, e.g. "A long walk after the rain". */
function suggestTitle(text: string): string {
  const first = sentences(text.replace(/[*_~`#>]/g, '').trim())[0] ?? '';
  const words = stripEndPunct(first).split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const cut = words.length > 7 ? words.slice(0, 6).join(' ').replace(/[,;:]$/, '') + '…' : words.join(' ');
  return capitalize(cut);
}

function dedupe<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((t) => !seen.has(key(t)) && seen.add(key(t)));
}

class Counter {
  private counts = new Map<string, number>();
  add(kind: string, n = 1): void {
    this.counts.set(kind, (this.counts.get(kind) ?? 0) + n);
  }
  describe(tasks: number, thanks: number): string[] {
    const c = (k: string) => this.counts.get(k) ?? 0;
    const out: string[] = [];
    if (c('tidy') || c('capital') || c('stop')) out.push('tidied punctuation and capitals');
    if (c('paragraph')) out.push(`gave long passages ${c('paragraph') === 1 ? 'a new paragraph' : `${c('paragraph')} new paragraphs`}`);
    if (c('heading')) out.push(c('heading') === 1 ? 'made a heading' : `made ${c('heading')} headings`);
    if (c('list') || c('checklist')) out.push('turned lists into proper lists');
    if (tasks) out.push(`gathered ${tasks === 1 ? 'a plan' : `${tasks} plans`} into a checklist`);
    if (thanks) out.push('collected what you’re grateful for');
    if (c('title')) out.push('suggested a title');
    return out;
  }
}
