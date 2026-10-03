import type { AiFeatureId } from '../../shared/aiFeatures';
import { readSettings } from '../settings';

/** Read from disk on every call: a switch turned off in Settings stops the very next request (security.md §Consent Model). */
export async function aiFeatureEnabled(id: AiFeatureId): Promise<boolean> {
  return (await readSettings()).aiFeatures?.[id] === true;
}
