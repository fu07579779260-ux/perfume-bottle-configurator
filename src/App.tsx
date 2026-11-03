import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'
import { href, useRoute, type Route } from '@/lib/router'
import {
  ConfigurePage,
  GuidePage,
  HomePage,
  InspirationPage,
  MyDesignsPage,
} from '@/pages/pages'

const PAGES: Record<Route, { label: string; Page: ComponentType }> = {
  '/': { label: 'Home', Page: HomePage },
  '/configure': { label: 'Configure', Page: ConfigurePage },
  '/inspiration': { label: 'Inspiration', Page: InspirationPage },
  '/guide': { label: 'Guide', Page: GuidePage },
  '/my-designs': { label: 'My designs', Page: MyDesignsPage },
}

export default function App() {
  const route = useRoute()
  const { Page } = PAGES[route]

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <nav aria-label="Main" className="mx-auto flex max-w-5xl flex-wrap gap-1 px-4 py-2">
          {(Object.keys(PAGES) as Route[]).map((r) => (
            <a
              key={r}
              href={href(r)}
              aria-current={r === route ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm hover:bg-accent',
                r === route && 'bg-secondary font-medium',
              )}
            >
              {PAGES[r].label}
            </a>
          ))}
        </nav>
      </header>
      <main>
        <Page />
      </main>
    </div>
  )
}
