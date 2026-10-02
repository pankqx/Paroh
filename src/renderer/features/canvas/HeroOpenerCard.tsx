import quotesFile from '@assets/openers/quotes.json';
import { formatShortDate } from '../../domain/dates';
import { pickDailyQuote, type OpenerQuote } from '../../domain/dailyOpener';

const quotes = (quotesFile as { quotes: OpenerQuote[] }).quotes;

export function HeroOpenerCard({ today, onWrite }: { today: string; onWrite: () => void }) {
  const quote = pickDailyQuote(quotes, today);
  return (
    <section className="card hero-card" aria-label="Daily opener">
      <div className="eyebrow">Daily opener · {formatShortDate(today)}</div>
      {quote && (
        <figure>
          <blockquote className="hero-quote">“{quote.text}”</blockquote>
          <figcaption className="hero-attribution">— {quote.attribution}</figcaption>
        </figure>
      )}
      <button className="btn btn-ghost-light" onClick={onWrite}>
        Write today’s entry
      </button>
    </section>
  );
}
