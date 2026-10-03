import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { EditorsNoteDraft } from '../../shared/ipc-contract';
import type { Entry } from '../../shared/types/Entry';
import type { EditorsNote } from '../../shared/types/EditorsNote';
import { err, ok, type Result } from '../../shared/types/Result';
import { atomicWrite } from '../vault/atomicWrite';
import { MONTH_RE, parseEditorsNote, serializeEditorsNote } from '../vault/editorsNoteFile';
import type { NarrativeProvider } from './AIProvider';
import { buildMonthDigest } from './monthDigest';

export interface EditorsNoteDeps {
  vaultRoot: () => string;
  loadMonth: (month: string) => Promise<Result<Entry[]>>;
  /** Read fresh on every request, so turning the switch off takes effect on the very next action (security.md). */
  enabled: () => Promise<boolean>;
  /** Null while no key is stored. */
  provider: () => Promise<NarrativeProvider | null>;
  now?: () => Date;
}

const MAX_NOTE_CHARS = 8000;

/**
 * Editor's Note for Chapters. Drafts come back to the renderer and are only written to
 * `<vault>/chapters/` when the person keeps one; nothing from Claude ever lands in the vault on its own.
 */
export class EditorsNoteService {
  private inFlight: AbortController | null = null;

  constructor(private deps: EditorsNoteDeps) {}

  async generate(month: string): Promise<Result<EditorsNoteDraft>> {
    if (!MONTH_RE.test(month)) return err('Unknown month');
    if (!(await this.deps.enabled())) return err('Editor’s Note is switched off. Turn it on in Settings to use it.');
    const provider = await this.deps.provider();
    if (!provider) return err('Add your Anthropic API key in Settings first.');
    const entries = await this.deps.loadMonth(month);
    if (!entries.ok) return entries;
    const digest = buildMonthDigest(month, entries.value);

    this.inFlight?.abort();
    const controller = new AbortController();
    this.inFlight = controller;
    try {
      const text = await provider.editorsNote(digest, controller.signal);
      if (!text.ok) return text;
      return ok({ month, text: text.value.slice(0, MAX_NOTE_CHARS), model: provider.model, entryCount: digest.entries.length });
    } finally {
      if (this.inFlight === controller) this.inFlight = null;
    }
  }

  cancel(): void {
    this.inFlight?.abort();
    this.inFlight = null;
  }

  async load(month: string): Promise<Result<EditorsNote | null>> {
    if (!MONTH_RE.test(month)) return err('Unknown month');
    try {
      return parseEditorsNote(await readFile(this.file(month), 'utf8'), month);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return ok(null);
      return err(`Could not read this month's note: ${(e as Error).message}`);
    }
  }

  /** Keeping a note is the person's action, so it works even if the switch was turned off after drafting. */
  async save(draft: EditorsNoteDraft): Promise<Result<EditorsNote>> {
    if (!MONTH_RE.test(draft?.month) || typeof draft.text !== 'string' || !draft.text.trim()) return err('Nothing to save');
    const note: EditorsNote = {
      month: draft.month,
      text: draft.text.slice(0, MAX_NOTE_CHARS).trim(),
      createdAt: (this.deps.now?.() ?? new Date()).toISOString(),
      model: typeof draft.model === 'string' ? draft.model.slice(0, 80) : '',
    };
    try {
      await mkdir(join(this.deps.vaultRoot(), 'chapters'), { recursive: true });
      await atomicWrite(this.file(note.month), serializeEditorsNote(note), (written) => (parseEditorsNote(written, note.month).ok ? null : 'note did not read back'));
      return ok(note);
    } catch (e) {
      return err(`Could not save the note: ${(e as Error).message}`);
    }
  }

  async remove(month: string): Promise<Result<void>> {
    if (!MONTH_RE.test(month)) return err('Unknown month');
    try {
      await rm(this.file(month), { force: true });
      return ok(undefined);
    } catch (e) {
      return err(`Could not remove the note: ${(e as Error).message}`);
    }
  }

  private file(month: string): string {
    return join(this.deps.vaultRoot(), 'chapters', `${month}.md`);
  }
}
