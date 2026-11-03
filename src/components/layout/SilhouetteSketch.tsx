import type { ReactNode } from 'react'
import type { Silhouette } from '@/model/options'

// Front-view sketches of each shell; the dashed line is the glass bottle inside
const SHELLS: Record<Silhouette, ReactNode> = {
  column: <rect x="16" y="26" width="32" height="68" rx="9" />,
  teardrop: <path d="M32 20C18 30 14 46 14 64c0 19 8 30 18 30s18-11 18-30c0-18-4-34-18-44Z" />,
  prism: (
    <>
      <path d="M19 26h26l5 9v51l-5 8H19l-5-8V35Z" />
      <path d="M25 26v68M39 26v68" fill="none" />
    </>
  ),
  pebble: <path d="M32 28c-15 0-21 14-21 32s7 34 21 34 21-16 21-34-6-32-21-32Z" />,
  exoskeleton: (
    <path
      d="M18 30c6 16 6 46 0 62M46 30c-6 16-6 46 0 62M18 30h28M18 92h28M18 50c10 6 18 6 28 0M18 72c10-6 18-6 28 0"
      fill="none"
    />
  ),
  coral: (
    <>
      <path d="M32 26c-12 0-20 9-20 22 0 8 3 12 2 19-1 9 6 27 18 27s19-18 18-27c-1-7 2-11 2-19 0-13-8-22-20-22Z" />
      <path
        d="M20 48c4-3 8 3 12 0s8-3 12 0M19 64c5-3 8 2 13-1s9-3 13 1M22 80c4-2 7 2 10 0s7-2 10 0"
        fill="none"
      />
    </>
  ),
}

export function SilhouetteSketch({ silhouette, className = 'mx-auto h-28 w-auto' }: { silhouette: Silhouette; className?: string }) {
  const open = silhouette === 'exoskeleton'

  return (
    <svg viewBox="0 0 64 100" aria-hidden="true" className={className}>
      {/* Glass bottle and its pump */}
      <rect x="22" y="34" width="20" height="56" rx="5" fill="var(--foam)" stroke="var(--tide)" strokeDasharray="2 2" />
      <rect x="28.5" y="24" width="7" height="10" rx="1.5" fill="none" stroke="var(--tide)" />
      {/* Printed shell */}
      <g
        fill={open ? 'none' : 'color-mix(in oklab, var(--lagoon) 22%, transparent)'}
        stroke="var(--deep)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {SHELLS[silhouette]}
      </g>
      {/* Printed cap */}
      <rect x="23" y="8" width="18" height="16" rx="5" fill="var(--coral)" />
    </svg>
  )
}
