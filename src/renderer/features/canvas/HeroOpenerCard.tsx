import quotesFile from '@assets/openers/quotes.json';
import { ArrowRight, PenLine } from 'lucide-react';
import { formatShortDate } from '../../domain/dates';
import { pickDailyQuote, type OpenerQuote } from '../../domain/dailyOpener';

const quotes = (quotesFile as { quotes: OpenerQuote[] }).quotes;

export function HeroOpenerCard({ today, hasEntry = false, onWrite }: { today: string; hasEntry?: boolean; onWrite: () => void }) {
  const quote = pickDailyQuote(quotes, today);
  return (
    <section className="card hero-card" aria-label="Daily opener">
      {/* A low sun over a horizon: decoration only, drawn rather than photographed so it suits both themes. */}
      <svg className="hero-art" viewBox="0 0 400 240" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
        <defs>
          <radialGradient id="hero-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffd59a" stopOpacity="0.55" />
            <stop offset="0.45" stopColor="#f08a4f" stopOpacity="0.22" />
            <stop offset="1" stopColor="#f08a4f" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="330" cy="215" r="170" fill="url(#hero-sun)" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={i} cx="330" cy="215" r={56 + i * 28} fill="none" stroke="#d8b46a" strokeOpacity={0.22 - i * 0.03} strokeWidth="1" />
        ))}
      </svg>
      <div className="hero-content">
        <div className="eyebrow">Daily opener · {formatShortDate(today)}</div>
        {quote && (
          <figure>
            <blockquote className="hero-quote">“{quote.text}”</blockquote>
            <figcaption className="hero-attribution">{quote.attribution}</figcaption>
          </figure>
        )}
        <button className="btn btn-light btn-lg hero-cta" onClick={onWrite}>
          <PenLine size={17} strokeWidth={1.9} aria-hidden="true" />
          {hasEntry ? 'Continue today’s page' : 'Write today’s entry'}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
