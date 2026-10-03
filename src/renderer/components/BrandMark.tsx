/** Paroh's mark: a hand-set "P" whose bowl opens like a page, with an ember dot for the day's light. */
export function BrandMark({ size = 32, drawn = false }: { size?: number; drawn?: boolean }) {
  return (
    <svg className={`brand-mark ${drawn ? 'brand-mark-drawn' : ''}`} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="pm-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--ink-2)" />
          <stop offset="1" stopColor="var(--ink)" />
        </linearGradient>
        <radialGradient id="pm-ember" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffcf8a" />
          <stop offset="0.55" stopColor="var(--accent-bright)" />
          <stop offset="1" stopColor="var(--accent)" />
        </radialGradient>
      </defs>
      <rect className="brand-mark-tile" x="1" y="1" width="46" height="46" rx="14" fill="url(#pm-tile)" />
      <path className="brand-mark-stroke" d="M17 37V13.5c0-.8.7-1.5 1.5-1.5H25a8.5 8.5 0 0 1 0 17h-4.5" fill="none" stroke="var(--on-ink)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
      <circle className="brand-mark-ember" cx="33.5" cy="35.5" r="3.6" fill="url(#pm-ember)" />
    </svg>
  );
}
