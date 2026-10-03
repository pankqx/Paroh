import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SpeechModelStore } from '../../../src/main/ai/SpeechModelStore';
import { SPEECH_MODEL, type SpeechModelStatus } from '../../../src/shared/speechModel';

let root: string;
let server: Server;
let host: string;
let missing: Set<string>;
const requests: string[] = [];

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paroh-models-'));
  missing = new Set(['added_tokens.json']);
  requests.length = 0;
  server = createServer((req, res) => {
    requests.push(req.url ?? '');
    const file = (req.url ?? '').split('/resolve/main/')[1];
    if (!file || missing.has(file)) {
      res.writeHead(404).end();
      return;
    }
    const body = Buffer.from(`contents of ${file}`);
    res.writeHead(200, { 'content-length': body.length }).end(body);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  host = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => {
  await new Promise((r) => server.close(r));
  await rm(root, { recursive: true, force: true });
});

describe('SpeechModelStore', () => {
  it('downloads every model file once, skips optional files the repo lacks, and reports ready', async () => {
    const changes: SpeechModelStatus[] = [];
    const store = new SpeechModelStore({ root, fetch, host, onChange: (s) => changes.push(s) });
    expect(await store.status()).toEqual({ state: 'missing' });
    expect(await store.download()).toEqual({ ok: true, value: undefined });
    expect(requests.every((u) => u.startsWith(`/${SPEECH_MODEL.id}/resolve/main/`))).toBe(true);
    expect(await readFile(join(store.dir, 'onnx', 'encoder_model_quantized.onnx'), 'utf8')).toBe('contents of onnx/encoder_model_quantized.onnx');
    await expect(stat(join(store.dir, 'added_tokens.json'))).rejects.toThrow();
    const status = await store.status();
    expect(status.state).toBe('ready');
    await new Promise((r) => setTimeout(r, 10));
    expect(changes.at(-1)?.state).toBe('ready');
  });

  it('fails cleanly when a required file is missing, leaving nothing half-downloaded', async () => {
    missing.add('onnx/decoder_model_merged_quantized.onnx');
    const store = new SpeechModelStore({ root, fetch, host });
    const r = await store.download();
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain('onnx/decoder_model_merged_quantized.onnx');
    expect(await store.status()).toEqual({ state: 'missing' });
    await expect(stat(store.dir)).rejects.toThrow();
  });

  it('only serves files inside the models folder', async () => {
    const store = new SpeechModelStore({ root, fetch, host });
    expect(store.resolveFile(`${SPEECH_MODEL.id}/config.json`)).toBe(join(root, 'onnx-community', 'whisper-base', 'config.json'));
    expect(store.resolveFile('../settings.json')).toBeNull();
    expect(store.resolveFile('%2e%2e/secrets.json')).toBeNull();
    expect(store.resolveFile('onnx-community/../../x')).toBeNull();
  });

  it('removes a downloaded model', async () => {
    const store = new SpeechModelStore({ root, fetch, host });
    await store.download();
    expect((await store.remove()).ok).toBe(true);
    expect(await store.status()).toEqual({ state: 'missing' });
  });
});
