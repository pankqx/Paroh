import { err, type Result } from '../../shared/types/Result';

/** The phone build leaves out the speech model runtime (about 28 MB); transcription is desktop-only for now. */
export async function transcribeRecording(): Promise<Result<string>> {
  return err('Transcription is in the desktop app for now.');
}
