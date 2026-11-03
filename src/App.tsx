import type { ComponentType } from 'react'
import { AppFooter } from '@/components/layout/AppFooter'
import { AppHeader } from '@/components/layout/AppHeader'
import { useT } from '@/i18n/language'
import { useRoute, type Route } from '@/lib/router'
import {
  ConfigurePage,
  GuidePage,
  HomePage,
  InspirationPage,
  MyDesignsPage,
} from '@/pages/pages'

const PAGES: Record<Route, ComponentType> = {
  '/': HomePage,
  '/configure': ConfigurePage,
  '/inspiration': InspirationPage,
  '/guide': GuidePage,
  '/my-designs': MyDesignsPage,
}

export default function App() {
  const route = useRoute()
  const t = useT()
  const Page = PAGES[route]

  return (
    <div className="tidewater flex min-h-dvh flex-col">
      <a
        href="#main"
        onClick={(e) => {
          // Plain #main would be read as a route by the hash router
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-deep focus:px-4 focus:py-2 focus:text-sand"
      >
        {t('app.skip')}
      </a>
      <AppHeader route={route} />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Page />
      </main>
      <AppFooter />
    </div>
  )
}
