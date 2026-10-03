import { Document, parse } from 'yaml';
import type { EditorsNote } from '../../shared/types/EditorsNote';
import { err, ok, type Result } from '../../shared/types/Result';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** `<vault>/chapters/YYYY-MM.md`: plain Markdown, so the note reads fine in any editor too. */
export function serializeEditorsNote(note: EditorsNote): string {
  const yaml = new Document({ schema_version: 1, month: note.month, kind: 'editors-note', created: note.createdAt, written_with: note.model }).toString().trimEnd();
  return `---\n${yaml}\n---\n\n${note.text.trim()}\n`;
}

export function parseEditorsNote(text: string, month: string): Result<EditorsNote> {
  const m = FRONTMATTER_RE.exec(text);
  if (!m) return ok({ month, text: text.trim(), createdAt: '', model: '' });
  try {
    const data = (parse(m[1]) ?? {}) as Record<string, unknown>;
    const created = data.created instanceof Date ? data.created.toISOString() : typeof data.created === 'string' ? data.created : '';
    return ok({ month, text: m[2].trim(), createdAt: created, model: typeof data.written_with === 'string' ? data.written_with : '' });
  } catch (e) {
    return err(`That note's frontmatter is not valid YAML: ${(e as Error).message}`);
  }
}
