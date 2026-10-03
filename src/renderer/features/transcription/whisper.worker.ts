/// <reference lib="webworker" />
import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import ortMjs from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';
import ortWasm from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import { MODEL_BASE_URL, SPEECH_MODEL } from '../../../shared/speechModel';
import type { WorkerRequest, WorkerResponse } from './protocol';

// Everything is local: model files come from the app (paroh-model://), the runtime from the app bundle.
// Transformers.js never reaches Hugging Face or a CDN from here.
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = MODEL_BASE_URL;
env.useBrowserCache = false;
env.useWasmCache = false;
const wasm = env.backends.onnx.wasm;
if (wasm) {
  wasm.wasmPaths = { mjs: new URL(ortMjs, self.location.href).href, wasm: new URL(ortWasm, self.location.href).href };
  // The page is not cross-origin isolated, so ONNX Runtime runs single-threaded.
  wasm.numThreads = 1;
}

let asr: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

function post(message: WorkerResponse): void {
  self.postMessage(message);
}

function load(id: number): Promise<AutomaticSpeechRecognitionPipeline> {
  asr ??= pipeline('automatic-speech-recognition', SPEECH_MODEL.id, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (p: { status: string; progress?: number }) => {
      if (p.status === 'progress' && typeof p.progress === 'number') post({ type: 'progress', id, stage: 'loading', percent: Math.round(p.progress) });
    },
  }).catch((e: unknown) => {
    asr = null;
    throw e;
  }) as Promise<AutomaticSpeechRecognitionPipeline>;
  return asr;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, audio } = event.data;
  try {
    const transcriber = await load(id);
    post({ type: 'progress', id, stage: 'transcribing' });
    const output = await transcriber(audio, { chunk_length_s: 30, stride_length_s: 5, task: 'transcribe' });
    const text = (Array.isArray(output) ? output.map((o) => o.text).join(' ') : output.text).trim();
    post({ type: 'done', id, text });
  } catch (e) {
    post({ type: 'error', id, message: (e as Error).message ?? String(e) });
  }
};
