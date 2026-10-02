export interface OpenerQuote {
  id: string;
  text: string;
  attribution: string;
}

/** Same quote all day, a different one tomorrow, without storing anything (feature-specifications.md §1). */
export function pickDailyQuote<T extends OpenerQuote>(quotes: readonly T[], date: string): T | undefined {
  if (quotes.length === 0) return undefined;
  let hash = 0;
  for (const ch of date) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return quotes[hash % quotes.length];
}
