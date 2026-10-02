import { emptyEntry, type Entry } from '../../../shared/types/Entry';
import type { Prompt } from '../../../shared/types/Prompt';
import { err, type Result } from '../../../shared/types/Result';
import { seedPromptIntoBody } from '../../domain/healingProgram';

async function updateToday(today: string, change: (entry: Entry) => Entry): Promise<Result<Entry>> {
  const loaded = await window.paroh.entries.load(today);
  if (!loaded.ok) return err(loaded.error);
  return window.paroh.entries.save(change(loaded.value ?? emptyEntry(today)));
}

/** "Write about it": records the prompt on today's entry and puts it at the top as a blockquote. */
export function writeAboutPrompt(today: string, prompt: Prompt): Promise<Result<Entry>> {
  return updateToday(today, (entry) => ({ ...entry, prompt_id: prompt.id, prompt_skipped: false, body: seedPromptIntoBody(entry.body, prompt) }));
}

/** "Skip": logged on today's entry so today keeps this prompt and tomorrow moves on. */
export function skipPrompt(today: string, prompt: Prompt): Promise<Result<Entry>> {
  return updateToday(today, (entry) => ({ ...entry, prompt_id: prompt.id, prompt_skipped: true }));
}
