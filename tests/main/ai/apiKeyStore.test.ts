import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApiKeyStore, looksLikeAnthropicKey, type Cipher } from '../../../src/main/ai/apiKeyStore';

const reverse: Cipher = {
  available: () => true,
  encrypt: (t) => Buffer.from([...t].reverse().join(''), 'utf8'),
  decrypt: (b) => [...b.toString('utf8')].reverse().join(''),
  strong: () => true,
};

describe('ApiKeyStore', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'paroh-keys-'));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('stores the key only in encrypted form and forgets it on request', async () => {
    const path = join(dir, 'secrets.json');
    const store = new ApiKeyStore(path, reverse);
    expect(await store.has()).toBe(false);
    await store.set('sk-ant-api03-abcdefghijklmnopqrstuvwxyz');
    expect(await store.get()).toBe('sk-ant-api03-abcdefghijklmnopqrstuvwxyz');
    expect(await readFile(path, 'utf8')).not.toContain('sk-ant');
    await store.set(null);
    expect(await store.has()).toBe(false);
  });

  it('falls back to an obscured (not encrypted) file on a computer with no keyring, and says so', async () => {
    const store = new ApiKeyStore(join(dir, 'secrets.json'), { ...reverse, available: () => false });
    await store.set('sk-ant-api03-abcdefghijklmnopqrstuvwxyz');
    expect(await store.get()).toBe('sk-ant-api03-abcdefghijklmnopqrstuvwxyz');
    expect(store.strong()).toBe(false);
    expect(await readFile(join(dir, 'secrets.json'), 'utf8')).not.toContain('sk-ant');
    if (process.platform !== 'win32') expect((await stat(join(dir, 'secrets.json'))).mode & 0o777).toBe(0o600);
  });

  it('recognises Anthropic keys and rejects obvious paste mistakes', () => {
    expect(looksLikeAnthropicKey(' sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123 ')).toBe(true);
    expect(looksLikeAnthropicKey('sk-proj-abcdefghijklmnopqrstuvwxyz')).toBe(false);
    expect(looksLikeAnthropicKey('sk-ant-short')).toBe(false);
    expect(looksLikeAnthropicKey('sk-ant-api03-abc def ghi jkl mno pqr stu')).toBe(false);
  });
});
