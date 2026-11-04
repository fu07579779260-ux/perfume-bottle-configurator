// Logo: a faceted gold flacon, its stopper above and the glass inside
export function BottleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path d="M13 2.5h6l1 4.5h-8Z" fill="var(--accent)" />
      <path d="M10 9h12l3 5.5v9.5L20.5 29h-9L7 24v-9.5Z" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12.5 13h7l2 3.5v6l-2.5 3h-6l-2.5-3v-6Z" fill="color-mix(in oklab, var(--gold) 35%, transparent)" />
    </svg>
  )
}
