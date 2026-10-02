import { describe, expect, it } from 'vitest';
import promptsFile from '../../../assets/prompts.json';
import { daysOfUse, EMERGENCY_PROMPTS, parsePromptLibrary, programPosition, seedPromptIntoBody, todaysPrompt } from '../../../src/renderer/domain/healingProgram';
import { categoryFor, PROMPT_CATEGORIES, type Prompt, type PromptLog } from '../../../src/shared/types/Prompt';

const library = parsePromptLibrary(promptsFile);
const dates = (n: number, from = '2026-01-01') => Array.from({ length: n }, (_, i) => new Date(Date.parse(`${from}T00:00:00Z`) + i * 86400000).toISOString().slice(0, 10));

describe('prompt library', () => {
  it('ships every week of the programme with unique ids and the right category', () => {
    expect(library).not.toBe(EMERGENCY_PROMPTS);
    expect(new Set(library.map((p) => p.id)).size).toBe(library.length);
    for (let week = 1; week <= 24; week++) {
      const prompts = library.filter((p) => p.week_block === week);
      expect(prompts.length).toBeGreaterThanOrEqual(5);
      for (const p of prompts) expect(p.category).toBe(categoryFor(week));
    }
    expect(PROMPT_CATEGORIES.map((c) => c.id)).toEqual(['noticing', 'restructuring', 'social-anxiety', 'behavioral-activation', 'self-compassion', 'relapse-proofing']);
  });

  it('falls back to the emergency set when the file is unusable, and drops malformed prompts', () => {
    expect(parsePromptLibrary(null)).toEqual(EMERGENCY_PROMPTS);
    expect(parsePromptLibrary({ prompts: [{ id: 'x' }] })).toEqual(EMERGENCY_PROMPTS);
    const good = { id: 'a', week_block: 2, category: 'noticing', text: 'Hi' };
    expect(parsePromptLibrary({ prompts: [good, { ...good }, { ...good, id: 'b', week_block: 30 }, { ...good, id: 'c', category: 'other' }] })).toEqual([good]);
  });
});

describe('programme position', () => {
  it('counts days of use, not calendar days, and ignores today', () => {
    expect(daysOfUse(['2026-01-01', '2026-03-01', '2026-03-01', '2026-03-05'], '2026-03-05')).toBe(2);
  });

  it('advances one week per seven days of use and loops after week 24', () => {
    expect(programPosition(0)).toEqual({ week: 1, cycle: 0 });
    expect(programPosition(6)).toEqual({ week: 1, cycle: 0 });
    expect(programPosition(7)).toEqual({ week: 2, cycle: 0 });
    expect(programPosition(24 * 7 - 1)).toEqual({ week: 24, cycle: 0 });
    expect(programPosition(24 * 7)).toEqual({ week: 1, cycle: 1 });
    expect(programPosition(30 * 7)).toEqual({ week: 7, cycle: 1 });
  });
});

describe('todaysPrompt', () => {
  it('picks from the current week, preferring prompts not seen yet', () => {
    const t = todaysPrompt(library, dates(9), [], '2026-02-01');
    expect(t.position.week).toBe(2);
    expect(t.prompt.week_block).toBe(2);
    expect(t.status).toBe('open');
    const seen: PromptLog[] = [{ prompt_id: t.prompt.id, date: '2026-01-09', outcome: 'answered' }];
    expect(todaysPrompt(library, dates(9), seen, '2026-02-01').prompt.id).not.toBe(t.prompt.id);
  });

  it('keeps a skipped prompt for the rest of the day instead of showing a replacement', () => {
    const before = todaysPrompt(library, dates(3), [], '2026-01-10');
    const history: PromptLog[] = [{ prompt_id: before.prompt.id, date: '2026-01-10', outcome: 'skipped' }];
    const after = todaysPrompt(library, [...dates(3), '2026-01-10'], history, '2026-01-10');
    expect(after.prompt.id).toBe(before.prompt.id);
    expect(after.status).toBe('skipped');
  });

  it('honours a prompt picked manually from a later week', () => {
    const later = library.find((p) => p.week_block === 20) as Prompt;
    const t = todaysPrompt(library, [], [{ prompt_id: later.id, date: '2026-01-10', outcome: 'answered' }], '2026-01-10');
    expect(t.prompt).toBe(later);
    expect(t.status).toBe('answered');
  });

  it('still works with only the emergency set', () => {
    expect(todaysPrompt(EMERGENCY_PROMPTS, dates(100), [], '2027-01-01').prompt.id).toMatch(/^emergency-/);
  });
});

describe('seedPromptIntoBody', () => {
  const prompt: Prompt = { id: 'p', week_block: 1, category: 'noticing', text: 'What shifted today?' };
  it('puts the prompt at the top as a blockquote, once', () => {
    expect(seedPromptIntoBody('', prompt)).toBe('> What shifted today?\n\n');
    const seeded = seedPromptIntoBody('Already wrote this.\n', prompt);
    expect(seeded).toBe('> What shifted today?\n\nAlready wrote this.\n');
    expect(seedPromptIntoBody(seeded, prompt)).toBe(seeded);
  });
});
