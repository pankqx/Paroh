/** Healing prompts (feature-specifications.md §5). The library itself lives in assets/prompts.json. */
export type PromptCategory = 'noticing' | 'restructuring' | 'social-anxiety' | 'behavioral-activation' | 'self-compassion' | 'relapse-proofing';

export interface Prompt {
  id: string;
  week_block: number; // 1–24
  category: PromptCategory;
  text: string;
  followups?: string[];
}

/** Derived from `prompt_id` / `prompt_skipped` in entry frontmatter; there is no separate log file. */
export interface PromptLog {
  prompt_id: string;
  date: string;
  outcome: 'answered' | 'skipped';
}

export const PROGRAM_WEEKS = 24;

/** The six 4-week blocks of the programme, in order (PRODUCT.md §7.1). */
export const PROMPT_CATEGORIES: readonly { id: PromptCategory; label: string; skill: string }[] = [
  { id: 'noticing', label: 'Noticing', skill: 'Spotting thought patterns and how mood, thoughts and actions connect' },
  { id: 'restructuring', label: 'Rethinking thoughts', skill: 'Naming thinking traps and weighing the evidence' },
  { id: 'social-anxiety', label: 'Social anxiety', skill: 'Facing social fears in small steps and letting go of the replay' },
  { id: 'behavioral-activation', label: 'Small actions', skill: 'Getting moving again with small, planned actions' },
  { id: 'self-compassion', label: 'Self-compassion', skill: 'Softening the inner critic and finding what matters to you' },
  { id: 'relapse-proofing', label: 'Your toolkit', skill: 'Keeping what worked and planning for harder weeks' },
];

export function isPromptCategory(value: unknown): value is PromptCategory {
  return PROMPT_CATEGORIES.some((c) => c.id === value);
}

export function categoryFor(weekBlock: number): PromptCategory {
  return PROMPT_CATEGORIES[Math.min(5, Math.floor((weekBlock - 1) / 4))].id;
}
