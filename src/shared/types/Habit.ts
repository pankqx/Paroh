export type HabitFrequency = 'daily' | 'weekdays' | 'custom';

/** Definitions live in `<vault>/.paroh/habits.json`; each day's completions live in that entry's `habits_snapshot`. */
export interface Habit {
  id: string;
  name: string;
  frequency: HabitFrequency;
  customDays?: number[]; // 0 = Sunday … 6 = Saturday
  createdAt: string; // YYYY-MM-DD
  archived: boolean;
}

export interface HabitDay {
  date: string;
  habits: string[];
}

export const SEED_HABITS = ['Morning pages', '10-min meditation', 'No social media', 'Walk outside', 'Gratitude list'];
