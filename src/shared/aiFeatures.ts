/**
 * Every AI feature, each with its own switch in Settings, all off by default (feature-specifications.md §12).
 * `leavesDevice` is the one sentence shown next to the switch saying exactly what, if anything, leaves this computer.
 */
export interface AiFeature {
  id: string;
  label: string;
  leavesDevice: string;
}

export const AI_FEATURES: readonly AiFeature[] = [];

export function isAiFeatureId(id: unknown): id is string {
  return AI_FEATURES.some((f) => f.id === id);
}
