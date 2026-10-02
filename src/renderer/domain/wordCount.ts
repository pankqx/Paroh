export function countWords(markdown: string): number {
  const words = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~[\]()|-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return words.length;
}

/** ~200 words a minute, rounded up, minimum one minute once there is any text. */
export function readMinutes(words: number): number {
  return words === 0 ? 0 : Math.max(1, Math.ceil(words / 200));
}
