import { err, ok, type Result } from '../../../shared/types/Result';
import type { TranscribeProgress, WorkerRequest, WorkerResponse } from './protocol';

export const SAMPLE_RATE = 16_000;

/** Whisper wants 16 kHz mono floats: the browser decodes the recording and resamples it to the context's rate. */
export async function decodeToMono16k(bytes: Uint8Array): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(1, SAMPLE_RATE, SAMPLE_RATE);
  const copy = bytes.slice().buffer;
  const decoded = await ctx.decodeAudioData(copy);
  return mixToMono(Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i)));
}

export function mixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0];
  const out = new Float32Array(channels[0]?.length ?? 0);
  for (const ch of channels) for (let i = 0; i < out.length; i++) out[i] += ch[i] / channels.length;
  return out;
}

/** Turns a worker error into a sentence for the person; the raw message is kept in brackets for bug reports. */
export function describeWorkerError(message: string): string {
  if (/404|not found|could not locate file|failed to fetch/i.test(message)) return 'The speech model is missing or incomplete. Download it again in Settings.';
  if (/protobuf|invalid model|failed to load model|onnx/i.test(message)) return `The speech model could not be loaded. Removing and downloading it again in Settings usually fixes this. (${message})`;
  return `Transcription did not finish: ${message}`;
}

let worker: Worker | null = null;
let nextId = 1;

function getWorker(): Worker {
  worker ??= new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module', name: 'paroh-speech' });
  return worker;
}

/** Runs one recording through the on-device model. Nothing here touches the network. */
export async function transcribeRecording(recordingId: string, onProgress?: (p: TranscribeProgress) => void): Promise<Result<string>> {
  const bytes = await window.paroh.audio.read(recordingId);
  if (!bytes.ok) return bytes;
  onProgress?.({ stage: 'decoding' });
  let audio: Float32Array;
  try {
    audio = await decodeToMono16k(bytes.value);
  } catch (e) {
    return err(`This recording could not be decoded: ${(e as Error).message}`);
  }
  if (audio.length < SAMPLE_RATE / 4) return err('This recording is too short to transcribe.');

  const id = nextId++;
  const w = getWorker();
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      const m = event.data;
      if (m.id !== id) return;
      if (m.type === 'progress') return onProgress?.(m.stage === 'loading' ? { stage: 'loading', percent: m.percent } : { stage: 'transcribing' });
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
      resolve(m.type === 'done' ? (m.text ? ok(m.text) : err('No speech was found in this recording.')) : err(describeWorkerError(m.message)));
    };
    const onError = (event: ErrorEvent) => {
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
      worker?.terminate();
      worker = null;
      resolve(err(describeWorkerError(event.message || 'the speech worker stopped')));
    };
    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);
    const request: WorkerRequest = { id, audio };
    w.postMessage(request, [audio.buffer]);
  });
}
