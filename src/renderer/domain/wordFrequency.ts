import { markdownToPlainText } from '../../shared/plainText';

// Standard English stopwords plus journaling filler. Names and other words the writer uses often are kept on purpose (§11 Edge Cases).
const STOPWORDS = new Set(
  `a about above after again against all also am an and any are aren't as at be because been before being below between both but by
  can can't cannot could couldn't did didn't do does doesn't doing don't down during each even ever every few for from further get gets
  got had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm
  i've if in into is isn't it it's its itself just let's like made make me more most much mustn't my myself no nor not now of off on once
  only or other ought our ours ourselves out over own really same shan't she she'd she'll she's should shouldn't so some still such than
  that that's the their theirs them themselves then there there's these they they'd they'll they're they've thing things think this those
  though through to today too under until up us very was wasn't way we we'd we'll we're we've were weren't what what's when when's where
  where's which while who who's whom why why's will with won't would wouldn't yet you you'd you'll you're you've your yours yourself
  yourselves day felt feel feeling bit lot maybe going went one two back around something kind`.split(/\s+/),
);

export interface WordCount {
  word: string;
  count: number;
}

/**
 * Most-used words across entry bodies, counted locally. Blockquotes are left out so a seeded
 * healing prompt (or a quote) doesn't outvote the person's own words.
 */
export function topWords(bodies: readonly string[], limit = 5): WordCount[] {
  const counts = new Map<string, number>();
  for (const body of bodies) {
    const own = body
      .split('\n')
      .filter((line) => !/^\s{0,3}>/.test(line))
      .join('\n');
    for (const raw of markdownToPlainText(own).toLowerCase().replace(/’/g, "'").match(/\p{L}[\p{L}']*/gu) ?? []) {
      const word = raw.replace(/'+$/, '');
      if (word.length < 3 || STOPWORDS.has(word) || word.includes("'")) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, limit);
}
