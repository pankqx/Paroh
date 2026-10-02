/** `[[target]]` or `[[target|label]]`, the Obsidian syntax, so vaults stay readable in Obsidian too. */
export const WIKILINK_RE = /\[\[([^[\]|\n]+)(?:\|([^[\]\n]+))?\]\]/g;

export function extractWikilinkTargets(markdown: string): string[] {
  const targets = new Set<string>();
  for (const m of markdown.matchAll(WIKILINK_RE)) targets.add(normalizeLinkTarget(m[1]));
  return [...targets];
}

export function normalizeLinkTarget(target: string): string {
  return target.trim().toLowerCase();
}
