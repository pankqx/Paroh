/** Messages between the page and the speech worker. Audio is 16 kHz mono, as Whisper expects. */
export interface WorkerRequest {
  id: number;
  audio: Float32Array;
}

export type WorkerResponse =
  | { type: 'progress'; id: number; stage: 'loading'; percent: number }
  | { type: 'progress'; id: number; stage: 'transcribing' }
  | { type: 'done'; id: number; text: string }
  | { type: 'error'; id: number; message: string };

export type TranscribeProgress = { stage: 'decoding' } | { stage: 'loading'; percent: number } | { stage: 'transcribing' };
