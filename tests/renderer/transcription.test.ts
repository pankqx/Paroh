import { describe, expect, it } from 'vitest';
import { describeWorkerError, mixToMono } from '../../src/renderer/features/transcription/transcribe';

describe('transcription helpers', () => {
  it('averages stereo down to the mono signal Whisper expects', () => {
    expect([...mixToMono([new Float32Array([1, 0.5]), new Float32Array([0, 0.5])])]).toEqual([0.5, 0.5]);
    const mono = new Float32Array([0.25]);
    expect(mixToMono([mono])).toBe(mono);
  });

  it('explains model problems in words that point to the fix', () => {
    expect(describeWorkerError('Could not locate file: "paroh-model://models/onnx-community/whisper-base/config.json".')).toBe('The speech model is missing or incomplete. Download it again in Settings.');
    expect(describeWorkerError('failed to load model: protobuf parsing failed')).toMatch(/^The speech model could not be loaded/);
    expect(describeWorkerError('out of memory')).toBe('Transcription did not finish: out of memory');
  });
});
