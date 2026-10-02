/** One recording in `<vault>/audio/`. Metadata lives in `<vault>/.paroh/audio.json`; files without metadata are still listed. */
export interface AudioLog {
  id: string; // file name without extension, e.g. 2026-06-11-023412
  filePath: string; // vault-relative, e.g. audio/2026-06-11-023412.webm
  title: string;
  createdAt: string; // ISO timestamp
  durationSeconds?: number; // missing if recording was interrupted
  linkedEntryDate?: string;
}
