import { useT } from '@/i18n/language'

// A fine gold rule above the footer, like the edge of a display case
export function AppFooter() {
  const t = useT()

  return (
    <footer className="mt-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="gilt-rule" aria-hidden="true" />
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-lg text-ink italic">{t('footer.tagline')}</p>
        <p className="text-muted">
          {t('footer.units')} · {t('footer.workshop')}
        </p>
      </div>
    </footer>
  )
}
