import { describe, expect, it } from 'vitest';
import { CloudAIProvider } from '../../../src/main/ai/CloudAIProvider';
import type { MonthDigest } from '../../../src/main/ai/AIProvider';

const digest: MonthDigest = { month: '2026-10', entries: [{ date: '2026-10-01', title: 'Lighthouse', mood: 'good', tags: ['walks'], text: 'Walked with Priya.' }] };

function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; headers: Headers; body: Record<string, unknown> }[] = [];
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'request-id': 'req_test' } });
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

const message = (content: unknown[], stop_reason = 'end_turn') => ({
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'claude-opus-5-5',
  content,
  stop_reason,
  stop_sequence: null,
  stop_details: null,
  usage: { input_tokens: 10, output_tokens: 5 },
});

describe('CloudAIProvider', () => {
  it('sends one month’s digest to Claude with the person’s key, the fallback beta and low effort', async () => {
    const { fetch, calls } = fakeFetch(200, message([{ type: 'thinking', thinking: '', signature: 's' }, { type: 'text', text: '  October began quietly.  ' }]));
    const r = await new CloudAIProvider({ apiKey: 'sk-ant-test-key-0000000000000000', fetch, timeoutMs: 5000 }).editorsNote(digest);
    expect(r).toEqual({ ok: true, value: 'October began quietly.' });
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call.url).toMatch(/\/v1\/messages\?beta=true$/);
    expect(call.headers.get('x-api-key')).toBe('sk-ant-test-key-0000000000000000');
    expect(call.headers.get('anthropic-beta')).toBe('server-side-fallback-2026-07-01');
    expect(call.body).toMatchObject({ model: 'claude-opus-5-5', max_tokens: 16000, fallbacks: 'default', output_config: { effort: 'low' } });
    expect(call.body).not.toHaveProperty('thinking');
    expect(JSON.stringify(call.body.messages)).toContain('Walked with Priya.');
  });

  it('never calls the API for an empty month', async () => {
    const { fetch, calls } = fakeFetch(200, message([]));
    const r = await new CloudAIProvider({ apiKey: 'k', fetch }).editorsNote({ month: '2026-10', entries: [] });
    expect(r.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('turns API failures and refusals into plain sentences', async () => {
    const auth = fakeFetch(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } });
    expect(await new CloudAIProvider({ apiKey: 'bad', fetch: auth.fetch }).editorsNote(digest)).toEqual({ ok: false, error: 'Anthropic did not accept that API key. Check it in Settings.' });

    const refused = fakeFetch(200, message([], 'refusal'));
    expect(await new CloudAIProvider({ apiKey: 'k', fetch: refused.fetch }).editorsNote(digest)).toEqual({ ok: false, error: 'Claude declined to write a note for this month. Your entries are unchanged.' });

    const offline = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof globalThis.fetch;
    const r = await new CloudAIProvider({ apiKey: 'k', fetch: offline, timeoutMs: 1000 }).editorsNote(digest);
    expect(r).toEqual({ ok: false, error: 'Could not reach Claude. Check your internet connection.' });
  });

  it('stops when aborted', async () => {
    const hang = ((_i: string | URL | Request, init?: RequestInit) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))) as typeof globalThis.fetch;
    const controller = new AbortController();
    const pending = new CloudAIProvider({ apiKey: 'k', fetch: hang }).editorsNote(digest, controller.signal);
    controller.abort();
    expect(await pending).toEqual({ ok: false, error: 'Stopped.' });
  });
});
