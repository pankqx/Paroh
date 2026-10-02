import { categoryFor, isPromptCategory, PROGRAM_WEEKS, type Prompt, type PromptLog } from '../../shared/types/Prompt';

/** Used only if assets/prompts.json is missing or malformed, so the feature can never go blank (§5 Errors). */
export const EMERGENCY_PROMPTS: readonly Prompt[] = [
  { id: 'emergency-001', week_block: 1, category: 'noticing', text: 'What is one thing you noticed about how you felt today?' },
  { id: 'emergency-002', week_block: 1, category: 'noticing', text: 'What took up most of your thinking today?' },
  { id: 'emergency-003', week_block: 1, category: 'noticing', text: 'What is one small thing that went okay today?' },
  { id: 'emergency-004', week_block: 1, category: 'noticing', text: 'What do you need more of this week?' },
  { id: 'emergency-005', week_block: 1, category: 'noticing', text: 'If today had a title, what would it be?' },
];

/** Validates the bundled library, dropping malformed prompts and falling back to the emergency set. */
export function parsePromptLibrary(data: unknown): Prompt[] {
  const raw = typeof data === 'object' && data !== null ? (data as { prompts?: unknown }).prompts : undefined;
  if (!Array.isArray(raw)) return [...EMERGENCY_PROMPTS];
  const seen = new Set<string>();
  const prompts: Prompt[] = [];
  for (const p of raw as Record<string, unknown>[]) {
    if (typeof p?.id !== 'string' || seen.has(p.id) || typeof p.text !== 'string' || !p.text.trim()) continue;
    if (!Number.isInteger(p.week_block) || (p.week_block as number) < 1 || (p.week_block as number) > PROGRAM_WEEKS || !isPromptCategory(p.category)) continue;
    seen.add(p.id);
    const followups = Array.isArray(p.followups) ? p.followups.filter((f): f is string => typeof f === 'string') : [];
    prompts.push({ id: p.id, week_block: p.week_block as number, category: p.category, text: p.text, ...(followups.length ? { followups } : {}) });
  }
  return prompts.length ? prompts : [...EMERGENCY_PROMPTS];
}

/**
 * Days of app use before today: days with an entry, not calendar days, so two quiet weeks
 * don't skip anyone ahead in the programme (§5 Acceptance Criteria).
 */
export function daysOfUse(entryDates: readonly string[], today: string): number {
  return new Set(entryDates.filter((d) => d < today)).size;
}

export interface ProgramPosition {
  week: number; // 1–24
  cycle: number; // 0 on the first run through, 1 after completing it once, …
}

/** One week-block per 7 days of use; after week 24 the programme loops back to week 1. */
export function programPosition(days: number): ProgramPosition {
  const weeks = Math.floor(Math.max(0, days) / 7);
  return { week: (weeks % PROGRAM_WEEKS) + 1, cycle: Math.floor(weeks / PROGRAM_WEEKS) };
}

export interface TodaysPrompt {
  prompt: Prompt;
  status: 'open' | 'answered' | 'skipped';
  position: ProgramPosition;
}

/**
 * Today's prompt. Once today's entry records a prompt (written about or skipped) that is today's
 * prompt for the rest of the day, so skipping never reveals a replacement. Otherwise it is the first
 * prompt in this week's block not seen before, rotating by day so repeats are spread out.
 */
export function todaysPrompt(library: readonly Prompt[], entryDates: readonly string[], history: readonly PromptLog[], today: string): TodaysPrompt {
  const days = daysOfUse(entryDates, today);
  const position = programPosition(days);
  const logged = history.find((h) => h.date === today);
  const loggedPrompt = logged && library.find((p) => p.id === logged.prompt_id);
  if (logged && loggedPrompt) return { prompt: loggedPrompt, status: logged.outcome, position };

  const pool = weekPool(library, position.week);
  const seen = new Set(history.filter((h) => h.date < today).map((h) => h.prompt_id));
  const start = days % pool.length;
  const rotated = [...pool.slice(start), ...pool.slice(0, start)];
  return { prompt: rotated.find((p) => !seen.has(p.id)) ?? rotated[0], status: 'open', position };
}

function weekPool(library: readonly Prompt[], week: number): Prompt[] {
  const exact = library.filter((p) => p.week_block === week);
  if (exact.length) return exact;
  const sameCategory = library.filter((p) => p.category === categoryFor(week));
  return sameCategory.length ? sameCategory : [...library];
}

/** Puts the prompt at the top of the entry as a blockquote, once (§5 Interactions). */
export function seedPromptIntoBody(body: string, prompt: Prompt): string {
  const quote = `> ${prompt.text}`;
  if (body.includes(quote)) return body;
  return body.trim() ? `${quote}\n\n${body}` : `${quote}\n\n`;
}
