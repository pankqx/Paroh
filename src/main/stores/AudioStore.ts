import { appendFile, mkdir, readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { toEntryDate } from '../../shared/localDate';
import type { AudioLog } from '../../shared/types/AudioLog';
import { emptyEntry } from '../../shared/types/Entry';
import { err, ok, type Result } from '../../shared/types/Result';
import type { EntryService } from '../EntryService';
import { readJsonFile, writeJsonFile } from '../vault/jsonFile';

interface AudioFile {
  schema_version: 1;
  logs: Omit<AudioLog, 'filePath'>[];
}

const MAX_TRANSCRIPT_CHARS = 100_000;
const ID_RE = /^\d{4}-\d{2}-\d{2}-\d{6}(-\d+)?$/;

/**
 * Recordings in `<vault>/audio/`. Chunks are appended to disk as they arrive, so a recording cut
 * short by a crash or closed window is still saved and playable up to that point (§8 edge cases).
 */
export class AudioStore {
  private readonly dir: string;
  private readonly metaPath: string;
  private active = new Set<string>();

  constructor(
    private entries: EntryService,
    private now: () => Date = () => new Date(),
  ) {
    this.dir = join(entries.root, 'audio');
    this.metaPath = join(entries.root, '.paroh', 'audio.json');
  }

  async begin(): Promise<Result<{ id: string }>> {
    try {
      await mkdir(this.dir, { recursive: true });
      const d = this.now();
      const base = `${toEntryDate(d)}-${[d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join('')}`;
      const existing = new Set(await readdir(this.dir));
      let id = base;
      for (let n = 2; existing.has(`${id}.webm`) || this.active.has(id); n++) id = `${base}-${n}`;
      await appendFile(this.file(id), new Uint8Array());
      this.active.add(id);
      return ok({ id });
    } catch (e) {
      return err(`Could not start recording: ${(e as Error).message}`);
    }
  }

  async append(id: string, chunk: Uint8Array): Promise<Result<void>> {
    if (!this.active.has(id)) return err('That recording is not in progress');
    try {
      await appendFile(this.file(id), chunk);
      return ok(undefined);
    } catch (e) {
      return err(`Could not save audio: ${(e as Error).message}`);
    }
  }

  /** Stores duration, then links the recording into that day's entry (`audio:` in frontmatter). */
  async finish(id: string, durationSeconds: number): Promise<Result<AudioLog>> {
    if (!this.active.delete(id)) return err('That recording is not in progress');
    const date = id.slice(0, 10);
    const d = this.now();
    const log: Omit<AudioLog, 'filePath'> = {
      id,
      title: `Recording ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`,
      createdAt: d.toISOString(),
      durationSeconds: Math.max(0, Math.round(durationSeconds)),
      linkedEntryDate: date,
    };
    try {
      const meta = await this.readMeta();
      meta.logs.push(log);
      await writeJsonFile(this.metaPath, meta);
    } catch (e) {
      return err(`Recording saved, but its details could not be stored: ${(e as Error).message}`);
    }
    const loaded = await this.entries.load(date);
    if (loaded.ok) {
      const entry = loaded.value ?? emptyEntry(date);
      const path = `audio/${id}.webm`;
      if (!entry.audio?.includes(path)) await this.entries.save({ ...entry, audio: [...(entry.audio ?? []), path] });
    }
    return ok({ ...log, filePath: `audio/${id}.webm` });
  }

  /** Newest first. Files with no metadata (an interrupted recording) are listed too. */
  async list(): Promise<Result<AudioLog[]>> {
    try {
      const meta = await this.readMeta();
      const byId = new Map(meta.logs.map((l) => [l.id, l]));
      let files: string[] = [];
      try {
        files = await readdir(this.dir);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      }
      const logs: AudioLog[] = [];
      for (const f of files) {
        const id = f.replace(/\.webm$/, '');
        if (!f.endsWith('.webm') || !ID_RE.test(id) || this.active.has(id)) continue;
        const known = byId.get(id);
        if (known) logs.push({ ...known, filePath: `audio/${f}` });
        else {
          const s = await stat(join(this.dir, f));
          if (s.size > 0) logs.push({ id, filePath: `audio/${f}`, title: 'Interrupted recording', createdAt: s.mtime.toISOString(), linkedEntryDate: id.slice(0, 10) });
        }
      }
      logs.sort((a, b) => (a.id < b.id ? 1 : -1));
      return ok(logs);
    } catch (e) {
      return err(`Could not list recordings: ${(e as Error).message}`);
    }
  }

  async read(id: string): Promise<Result<Uint8Array>> {
    if (!ID_RE.test(id)) return err('Unknown recording');
    try {
      return ok(new Uint8Array(await readFile(this.file(id))));
    } catch (e) {
      return err(`Could not open recording: ${(e as Error).message}`);
    }
  }

  async rename(id: string, title: string): Promise<Result<void>> {
    const clean = title.trim().slice(0, 120);
    if (!ID_RE.test(id) || !clean) return err('Give the recording a name');
    try {
      const meta = await this.readMeta();
      const log = meta.logs.find((l) => l.id === id);
      if (log) log.title = clean;
      else meta.logs.push({ id, title: clean, createdAt: new Date().toISOString(), linkedEntryDate: id.slice(0, 10) });
      await writeJsonFile(this.metaPath, meta);
      return ok(undefined);
    } catch (e) {
      return err(`Could not rename: ${(e as Error).message}`);
    }
  }

  /** Saves text transcribed on this computer next to the recording's other details; empty text removes it. */
  async setTranscript(id: string, text: string): Promise<Result<AudioLog>> {
    if (!ID_RE.test(id) || typeof text !== 'string') return err('Unknown recording');
    const clean = text.trim().slice(0, MAX_TRANSCRIPT_CHARS);
    try {
      const meta = await this.readMeta();
      let log = meta.logs.find((l) => l.id === id);
      if (!log) {
        await stat(this.file(id));
        log = { id, title: 'Interrupted recording', createdAt: this.now().toISOString(), linkedEntryDate: id.slice(0, 10) };
        meta.logs.push(log);
      }
      if (clean) {
        log.transcript = clean;
        log.transcribedAt = this.now().toISOString();
      } else {
        delete log.transcript;
        delete log.transcribedAt;
      }
      await writeJsonFile(this.metaPath, meta);
      this.entries.indexTranscript(id, log.linkedEntryDate ?? id.slice(0, 10), clean);
      return ok({ ...log, filePath: `audio/${id}.webm` });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return err('That recording is no longer in the vault');
      return err(`Could not save the transcript: ${(e as Error).message}`);
    }
  }

  /** Called when a vault opens, so transcripts made earlier (or on another computer) are searchable. */
  async syncTranscriptIndex(): Promise<void> {
    try {
      const meta = await this.readMeta();
      this.entries.indexTranscripts(meta.logs.filter((l) => l.transcript).map((l) => ({ id: l.id, date: l.linkedEntryDate ?? l.id.slice(0, 10), text: l.transcript ?? '' })));
    } catch (e) {
      console.warn('Could not index transcripts:', (e as Error).message);
    }
  }

  private file(id: string): string {
    return join(this.dir, `${id}.webm`);
  }

  private async readMeta(): Promise<AudioFile> {
    const meta = await readJsonFile<AudioFile>(this.metaPath, { schema_version: 1, logs: [] });
    return { schema_version: 1, logs: Array.isArray(meta.logs) ? meta.logs : [] };
  }
}
