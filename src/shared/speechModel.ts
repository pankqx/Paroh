/**
 * The on-device speech model for local transcription (roadmap Phase 8). Whisper base, multilingual,
 * 8-bit weights, run by Transformers.js on ONNX Runtime Web inside the app. Downloaded once by the main
 * process into the app's config folder (never into the vault) and served to the renderer read-only.
 */
export const SPEECH_MODEL = {
  id: 'onnx-community/whisper-base',
  revision: 'main',
  approxMegabytes: 80,
  /** Files Transformers.js reads for `automatic-speech-recognition` with `dtype: 'q8'`. */
  files: [
    { path: 'config.json', required: true },
    { path: 'generation_config.json', required: true },
    { path: 'preprocessor_config.json', required: true },
    { path: 'tokenizer.json', required: true },
    { path: 'tokenizer_config.json', required: true },
    { path: 'special_tokens_map.json', required: false },
    { path: 'added_tokens.json', required: false },
    { path: 'normalizer.json', required: false },
    { path: 'onnx/encoder_model_quantized.onnx', required: true },
    { path: 'onnx/decoder_model_merged_quantized.onnx', required: true },
  ],
} as const;

/** The scheme the renderer loads model files from: `paroh-model://models/<model id>/<file>`. */
export const MODEL_SCHEME = 'paroh-model';
export const MODEL_BASE_URL = `${MODEL_SCHEME}://models/`;

export type SpeechModelStatus =
  | { state: 'missing' }
  | { state: 'downloading'; receivedBytes: number; totalBytes: number | null; file: string }
  | { state: 'ready'; bytes: number }
  | { state: 'error'; message: string };
