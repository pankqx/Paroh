/** A month's Editor's Note, kept only after the person accepts the draft. Stored at `<vault>/chapters/YYYY-MM.md`. */
export interface EditorsNote {
  month: string; // YYYY-MM
  text: string;
  createdAt: string; // ISO timestamp
  model: string; // which Claude model wrote the draft
}
