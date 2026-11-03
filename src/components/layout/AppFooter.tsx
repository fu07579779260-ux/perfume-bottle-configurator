import { useT } from '@/i18n/language'

// A soft wave rolls in above the footer
export function AppFooter() {
  const t = useT()

  return (
    <footer className="mt-16 overflow-hidden">
      <svg
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="drift block h-10 w-[106%] text-deep"
      >
        <path
          d="M0 34c120-22 240-22 360 0s240 22 360 0 240-22 360 0 240 22 360 0v26H0Z"
          fill="currentColor"
          opacity="0.18"
        />
        <path d="M0 42c160-20 320-20 480 0s320 20 480 0 320-20 480 0v18H0Z" fill="currentColor" />
      </svg>
      <div className="bg-deep text-sand">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-base [font-variation-settings:'SOFT'_100]">{t('footer.tagline')}</p>
          <p className="text-sand/70">
            {t('footer.units')} · {t('footer.workshop')}
          </p>
        </div>
      </div>
    </footer>
  )
}
