import { Briefcase, GraduationCap, HeartPulse, Plane, Sparkles, Users, Wallet, type LucideIcon } from 'lucide-react';
import type { PlanArea } from '../../../shared/types/Planner';

export const AREAS: Record<PlanArea, { label: string; Icon: LucideIcon }> = {
  personal: { label: 'Personal', Icon: Sparkles },
  work: { label: 'Work', Icon: Briefcase },
  health: { label: 'Health', Icon: HeartPulse },
  learning: { label: 'Learning', Icon: GraduationCap },
  travel: { label: 'Travel', Icon: Plane },
  money: { label: 'Money', Icon: Wallet },
  people: { label: 'People', Icon: Users },
};
