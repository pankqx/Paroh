import { HABIT_COLORS, type Habit, type HabitColor } from '../../../shared/types/Habit';

export const HABIT_COLOR_LABEL: Record<HabitColor, string> = { ember: 'Ember', gold: 'Gold', sage: 'Sage', ocean: 'Ocean', plum: 'Plum', rose: 'Rose' };

/** A habit's own colour, or one picked by its place in the list so a fresh list is never monochrome. */
export function habitColor(habit: Habit, index: number): HabitColor {
  return habit.color ?? HABIT_COLORS[index % HABIT_COLORS.length];
}
