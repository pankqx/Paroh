import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A voice note recorded straight into the page. Unlike Audio Logs (streamed to disk as it records),
 * a note is short, so it is held in memory and saved once, as a `.weba` file in media/.
 */
export function useVoiceNote(onSaved: (path: string) => void) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<{ recorder: MediaRecorder; stream: MediaStream; chunks: Blob[]; timer: ReturnType<typeof setInterval> } | null>(null);

  const stopTracks = () => session.current?.stream.getTracks().forEach((t) => t.stop());

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus' } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = async () => {
        clearInterval(session.current?.timer);
        stopTracks();
        session.current = null;
        setRecording(false);
        const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
        const stamp = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }).replace(/\D+/g, '');
        const saved = await window.paroh.media.save(`voice-note-${stamp}.weba`, bytes);
        if (saved.ok) onSaved(saved.value.path);
        else setError(saved.error);
      };
      const begun = Date.now();
      const timer = setInterval(() => setSeconds(Math.round((Date.now() - begun) / 1000)), 500);
      session.current = { recorder, stream, chunks, timer };
      setSeconds(0);
      setRecording(true);
      recorder.start(1000);
    } catch (e) {
      const name = (e as DOMException).name;
      setError(name === 'NotAllowedError' ? 'Paroh is not allowed to use the microphone. Allow it in your system settings, then try again.' : 'No microphone was found.');
    }
  }, [onSaved]);

  const stop = useCallback(() => session.current?.recorder.stop(), []);

  // Leaving the page mid-note still keeps what was said.
  useEffect(
    () => () => {
      if (session.current?.recorder.state === 'recording') session.current.recorder.stop();
    },
    [],
  );

  return { recording, seconds, error, dismissError: () => setError(null), toggle: () => (session.current ? stop() : void start()) };
}
