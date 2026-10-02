import { describe, expect, it } from 'vitest';
import { parseEntry, serializeEntry } from '../../../src/main/vault/frontmatter';
import type { Entry } from '../../../src/shared/types/Entry';

const entry: Entry = {
  schema_version: 1,
  date: '2026-06-11',
  title: 'June 11: a quiet morning',
  mood: 'ok',
  tags: ['gratitude', 'anxiety'],
  visibility: 'private',
  body: 'Woke up before the alarm.\n\n## What changed\n\n- coffee\n- pigeons\n',
};

describe('entry frontmatter', () => {
  it('round-trips an entry through Markdown without losing anything', () => {
    const parsed = parseEntry(serializeEntry(entry), entry.date);
    expect(parsed).toEqual({ ok: true, value: entry });
  });

  it('writes the frontmatter keys in the documented order', () => {
    const text = serializeEntry(entry);
    expect(text.startsWith('---\nschema_version: 1\ndate: 2026-06-11\ntitle:')).toBe(true);
    expect(text).toContain('tags: [gratitude, anxiety]');
  });

  it('keeps frontmatter keys it does not understand, so newer or hand-made files survive a save', () => {
    const text = '---\nschema_version: 1\ndate: 2026-06-11\ntitle: x\nweather: rain\n---\n\nbody\n';
    const parsed = parseEntry(text, '2026-06-11');
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.value.extra).toEqual({ weather: 'rain' });
    expect(serializeEntry(parsed.value)).toContain('weather: rain');
  });

  it('round-trips the healing prompt fields', () => {
    const withPrompt: Entry = { ...entry, prompt_id: 'social-anxiety-002', prompt_skipped: true };
    const text = serializeEntry(withPrompt);
    expect(text).toContain('prompt_id: social-anxiety-002\nprompt_skipped: true');
    expect(parseEntry(text, entry.date)).toEqual({ ok: true, value: withPrompt });
  });

  it('reads a plain Markdown file with no frontmatter as a valid entry', () => {
    const parsed = parseEntry('Just some words.\n', '2026-06-12');
    expect(parsed.ok && parsed.value.body).toBe('Just some words.\n');
    expect(parsed.ok && parsed.value.date).toBe('2026-06-12');
  });

  it('reports broken YAML instead of guessing', () => {
    const parsed = parseEntry('---\ntitle: [unclosed\n---\nbody', '2026-06-12');
    expect(parsed.ok).toBe(false);
  });

  it('drops an unknown mood rather than storing garbage', () => {
    const parsed = parseEntry('---\nmood: ecstatic\n---\n', '2026-06-12');
    expect(parsed.ok && parsed.value.mood).toBeUndefined();
  });
});

import { markdownToPlainText } from '../../../src/shared/plainText';

describe('markdownToPlainText', () => {
  it('keeps the words and drops the Markdown', () => {
    expect(markdownToPlainText('## Title\n\n- **bold** and _it_\n> quote [[A morning|that day]] [site](https://x.y)\n```\ncode\n```')).toBe('Title bold and it quote that day site');
  });
});

describe('daily-practice fields', () => {
  it('round-trips habits_snapshot and audio, and omits them when empty', () => {
    const withFields = { ...entry, habits_snapshot: ['walk', 'read'], audio: ['audio/2026-06-11-090000.webm'] };
    const text = serializeEntry(withFields);
    expect(text).toContain('habits_snapshot: [walk, read]');
    expect(parseEntry(text, entry.date)).toEqual({ ok: true, value: withFields });
    expect(serializeEntry({ ...entry, habits_snapshot: [] })).not.toContain('habits_snapshot');
  });
});
