/** Life areas a plan or goal belongs to; each has its own ink in the planners. */
export const PLAN_AREAS = ['personal', 'work', 'health', 'learning', 'travel', 'money', 'people'] as const;
export type PlanArea = (typeof PLAN_AREAS)[number];

/** Something on a day or across days: "Dentist 10:00", "Trip to the hills 12–15 Oct". */
export interface PlanEvent {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  start: string;
  /** YYYY-MM-DD, inclusive; absent for a single day. */
  end?: string;
  /** HH:MM, for a single-day plan at a time. */
  time?: string;
  area: PlanArea;
  notes?: string;
  /** Marks a milestone: drawn larger on the year ribbon. */
  milestone?: boolean;
}

/** A goal for a month ("2026-10") or a whole year ("2026"), with progress the person sets. */
export interface PlanGoal {
  id: string;
  period: string;
  text: string;
  area: PlanArea;
  /** 0–100 */
  progress: number;
}

export interface PlannerData {
  events: PlanEvent[];
  goals: PlanGoal[];
}

export type PlanEventInput = Omit<PlanEvent, 'id'>;
export type PlanGoalInput = Omit<PlanGoal, 'id'>;
