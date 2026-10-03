/**
 * Every AI feature, each with its own switch in Settings, all off by default (feature-specifications.md §12).
 * `leavesDevice` is the one sentence shown next to the switch saying exactly what, if anything, leaves this computer.
 */
export interface AiFeature {
  id: AiFeatureId;
  label: string;
  leavesDevice: string;
}

export type AiFeatureId = 'editors-note' | 'transcription';

export const AI_FEATURES: readonly AiFeature[] = [
  {
    id: 'editors-note',
    label: "Editor's Note in Chapters",
    leavesDevice:
      "Only when you ask for a note, that month's entry text, moods and tags are sent to Anthropic's Claude API with your own API key. Audio, other months and everything else stay here.",
  },
  {
    id: 'transcription',
    label: 'Transcribe recordings on this computer',
    leavesDevice:
      'Nothing about you leaves this computer. Paroh downloads a speech model from Hugging Face once, then turns recordings into text here, offline.',
  },
];

export function isAiFeatureId(id: unknown): id is AiFeatureId {
  return AI_FEATURES.some((f) => f.id === id);
}
