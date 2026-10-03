import Anthropic from '@anthropic-ai/sdk';
import { err, ok, type Result } from '../../shared/types/Result';
import type { MonthDigest, NarrativeProvider } from './AIProvider';
import { EDITORS_NOTE_SYSTEM, editorsNoteUserMessage } from './editorsNotePrompt';

export const CLAUDE_MODEL = 'claude-opus-5-5';

export interface CloudOptions {
  apiKey: string;
  /** Tests point this at a local server. */
  baseURL?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Claude via the Anthropic API, using the person's own key. Only ever constructed after the matching
 * feature switch is checked in the main process, and only sent what that one feature needs.
 */
export class CloudAIProvider implements NarrativeProvider {
  readonly model = CLAUDE_MODEL;
  private client: Anthropic;

  constructor(opts: CloudOptions) {
    this.client = new Anthropic({
      apiKey: opts.apiKey,
      ...(opts.baseURL ? { baseURL: opts.baseURL } : {}),
      ...(opts.fetch ? { fetch: opts.fetch } : {}),
      timeout: opts.timeoutMs ?? 120_000,
      maxRetries: 2,
    });
  }

  async editorsNote(digest: MonthDigest, signal?: AbortSignal): Promise<Result<string>> {
    if (!digest.entries.length) return err('There is nothing written this month yet, so there is nothing for an Editor’s Note to read.');
    try {
      const response = await this.client.beta.messages.create(
        {
          model: CLAUDE_MODEL,
          max_tokens: 16000,
          output_config: { effort: 'low' },
          system: EDITORS_NOTE_SYSTEM,
          messages: [{ role: 'user', content: editorsNoteUserMessage(digest) }],
          // If a safety classifier declines, Anthropic retries on its recommended model instead of failing.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
        },
        { signal },
      );
      if (response.stop_reason === 'refusal') return err('Claude declined to write a note for this month. Your entries are unchanged.');
      const text = response.content
        .flatMap((b) => (b.type === 'text' ? [b.text] : []))
        .join('')
        .trim();
      if (!text) return err('Claude sent back an empty note. Try again in a moment.');
      return ok(text);
    } catch (e) {
      return err(describeError(e));
    }
  }
}

function describeError(e: unknown): string {
  if (e instanceof Anthropic.APIUserAbortError) return 'Stopped.';
  if (e instanceof Anthropic.AuthenticationError) return 'Anthropic did not accept that API key. Check it in Settings.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'That API key is not allowed to use this model. Check your Anthropic account.';
  if (e instanceof Anthropic.RateLimitError) return 'Anthropic is limiting requests on this key right now. Try again in a minute.';
  if (e instanceof Anthropic.BadRequestError) return `Anthropic could not process the request: ${e.message}`;
  if (e instanceof Anthropic.APIConnectionTimeoutError) return 'Claude took too long to answer. Try again.';
  if (e instanceof Anthropic.APIConnectionError) return 'Could not reach Claude. Check your internet connection.';
  if (e instanceof Anthropic.APIError) return `Claude is unavailable right now (error ${e.status ?? 'unknown'}). Try again later.`;
  return `Could not get a note: ${(e as Error).message}`;
}
