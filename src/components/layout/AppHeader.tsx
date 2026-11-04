import { useT } from '@/i18n/language'
import type { StringKey } from '@/i18n/strings'
import { href, ROUTES, type Route } from '@/lib/router'
import { cn } from '@/lib/utils'
import { BottleMark } from './BottleMark'
import { LanguageSwitch } from './LanguageSwitch'

const NAV_LABELS: Record<Route, StringKey> = {
  '/': 'nav.home',
  '/configure': 'nav.configure',
  '/inspiration': 'nav.inspiration',
  '/guide': 'nav.guide',
  '/my-designs': 'nav.myDesigns',
}

export function AppHeader({ route }: { route: Route }) {
  const t = useT()

  return (
    <header className="sticky top-0 z-40 border-b border-rule/70 bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <a href={href('/')} className="flex items-center gap-2.5">
          <BottleMark className="size-8" />
          <span className="font-display text-lg leading-none font-semibold">
            {t('app.title')}
          </span>
        </a>
        <div className="ml-auto">
          <LanguageSwitch />
        </div>
      </div>
      <nav aria-label={t('nav.label')}>
        {/* Scrolls sideways on narrow screens instead of wrapping */}
        <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2.5">
          {ROUTES.map((r) => (
            <li key={r} className="shrink-0">
              <a
                href={href(r)}
                aria-current={r === route ? 'page' : undefined}
                className={cn(
                  'block rounded-full px-3.5 py-1.5 text-sm transition-colors',
                  r === route ? 'bg-gold font-medium text-canvas' : 'text-muted hover:bg-soft hover:text-ink',
                )}
              >
                {t(NAV_LABELS[r])}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
