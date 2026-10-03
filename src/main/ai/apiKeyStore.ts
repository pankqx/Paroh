import { chmod, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { atomicWrite } from '../vault/atomicWrite';

/** Electron's `safeStorage`, narrowed to what the key store needs so tests can swap it. */
export interface Cipher {
  /** False when the OS offers no encryption at all (Linux with no keyring service running). */
  available(): boolean;
  encrypt(text: string): Buffer;
  decrypt(data: Buffer): string;
  /** True only for real OS-keyring encryption, not Electron's fixed-password fallback. */
  strong(): boolean;
}

interface SecretsFile {
  v: 1;
  /** `os`: encrypted by the OS keyring. `plain`: base64 only, used when this computer has no keyring. */
  scheme: 'os' | 'plain';
  anthropic: string;
}

/**
 * The person's Anthropic API key, encrypted with the OS keyring and kept in the app's config folder,
 * never in the vault (an export or a synced vault must never carry it) and never sent to the renderer.
 */
export class ApiKeyStore {
  constructor(
    private path: string,
    private cipher: Cipher,
  ) {}

  async set(key: string | null): Promise<void> {
    if (key === null) return rm(this.path, { force: true });
    await mkdir(dirname(this.path), { recursive: true });
    const os = this.cipher.available();
    const data: SecretsFile = { v: 1, scheme: os ? 'os' : 'plain', anthropic: (os ? this.cipher.encrypt(key) : Buffer.from(key, 'utf8')).toString('base64') };
    await atomicWrite(this.path, JSON.stringify(data));
    await chmod(this.path, 0o600);
  }

  async get(): Promise<string | null> {
    try {
      const data = JSON.parse(await readFile(this.path, 'utf8')) as Partial<SecretsFile>;
      if (!data.anthropic) return null;
      const raw = Buffer.from(data.anthropic, 'base64');
      return data.scheme === 'plain' ? raw.toString('utf8') : this.cipher.decrypt(raw);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') console.warn('Stored API key unreadable:', (e as Error).message);
      return null;
    }
  }

  async has(): Promise<boolean> {
    return (await this.get()) !== null;
  }

  strong(): boolean {
    return this.cipher.available() && this.cipher.strong();
  }
}

/** Anthropic keys start with `sk-ant-`; anything else is almost certainly a paste mistake. */
export function looksLikeAnthropicKey(key: string): boolean {
  return /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(key.trim());
}
