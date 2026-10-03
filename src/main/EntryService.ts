import { watch, type FSWatcher } from 'node:fs';
import { join } from 'node:path';
import { isEntryDate } from '../shared/types/Entry';
import { IndexRepository } from './index-db/IndexRepository';
import { NodeVaultFs } from './vault/NodeVaultFs';
import { VaultService } from './VaultService';

/** The desktop's vault service: Node's filesystem, the SQLite index, and a watcher for outside edits. */
export class EntryService extends VaultService {
  private watcher?: FSWatcher;
  private pending = new Map<string, ReturnType<typeof setTimeout>>();

  static async open(root: string, indexPath = join(root, '.paroh', 'index.db')): Promise<EntryService> {
    const service = new EntryService(new NodeVaultFs(root), IndexRepository.open(indexPath));
    await service.sync();
    return service;
  }

  /**
   * Watches for entries changed outside Paroh (another editor, a sync tool). Our own saves are
   * recognised because the index already holds that file's mtime, so they don't echo back.
   */
  watch(onChange: (dates: string[]) => void): void {
    this.watcher = watch(this.root, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      // Windows reports `2026-10\\2026-10-02.md`, Linux and macOS `2026-10/2026-10-02.md`.
      const parts = filename.toString().split(/[\\/]/);
      const file = parts[parts.length - 1];
      const date = file.replace(/\.md$/, '');
      if (parts.length !== 2 || !file.endsWith('.md') || !isEntryDate(date) || parts[0] !== date.slice(0, 7)) return;
      clearTimeout(this.pending.get(date));
      this.pending.set(
        date,
        setTimeout(() => {
          this.pending.delete(date);
          void this.handleExternalChange(date).then((changed) => changed && onChange([date]));
        }, 250),
      );
    });
    this.watcher.on('error', (e) => console.error('Vault watcher stopped:', e.message));
  }

  close(): void {
    this.watcher?.close();
    for (const t of this.pending.values()) clearTimeout(t);
    super.close();
  }
}
