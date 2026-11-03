// Logo: a glass bottle (inner line) inside a soft printed shell, with a cap
export function BottleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect x="12" y="2.5" width="8" height="6" rx="2" fill="var(--coral)" />
      <path
        d="M16 9.5c-5.5 0-9 4.2-9 9.6 0 5.6 3.8 9.9 9 9.9s9-4.3 9-9.9c0-5.4-3.5-9.6-9-9.6Z"
        fill="var(--lagoon)"
      />
      <path
        d="M16 13c-3.2 0-5.3 2.6-5.3 6 0 3.5 2.2 6.3 5.3 6.3s5.3-2.8 5.3-6.3c0-3.4-2.1-6-5.3-6Z"
        fill="var(--foam)"
      />
    </svg>
  )
}
