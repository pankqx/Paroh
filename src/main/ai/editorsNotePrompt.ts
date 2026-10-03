import type { MonthDigest } from './AIProvider';

/**
 * The Editor's Note voice: a warm magazine editor writing a short introduction to one month of
 * someone's journal, as if it were a chapter. Kept free of dates and other per-request values so
 * the system prompt stays byte-identical between calls.
 */
export const EDITORS_NOTE_SYSTEM = `You write the "Editor's Note" for one month of a person's private journal in Paroh, a calm journaling app. The person will read your note at the top of that month's Chapter page, the way a magazine opens an issue.

Write to the person as "you", in warm, plain, unhurried prose. Two or three short paragraphs, about 120 to 200 words in total. No headings, lists or bullet points, and no title.

Notice what the month held: recurring people, places and themes, how moods moved across the weeks, small wins, and anything that changed. Quote or echo the person's own words now and then. Describe; do not judge, grade, diagnose or give advice. Hard days are part of the story, not a failure, and an empty stretch is just quiet.

If any entry suggests the person might be in danger or thinking about harming themselves, gently say that support is worth reaching for and that talking to someone they trust or a local crisis line can help, without alarm.

Only use what is in the entries. Do not invent events, people or feelings. Write the note in the language most of the entries are written in.`;

/** Entries go in as tagged blocks so the model can tell one day from the next and the text from its metadata. */
export function editorsNoteUserMessage(digest: MonthDigest): string {
  const monthName = new Date(`${digest.month}-01T12:00:00`).toLocaleDateString('en', { month: 'long', year: 'numeric' });
  const days = digest.entries.map((e) => {
    const meta = [`date="${e.date}"`, e.mood ? `mood="${e.mood}"` : '', e.tags.length ? `tags="${e.tags.join(', ')}"` : ''].filter(Boolean).join(' ');
    return `<entry ${meta}>\n${e.title ? `Title: ${e.title}\n` : ''}${e.text}\n</entry>`;
  });
  return `Here are my journal entries for ${monthName} (${digest.entries.length} ${digest.entries.length === 1 ? 'day' : 'days'}).\n\n${days.join('\n\n')}\n\nPlease write this month's Editor's Note.`;
}
