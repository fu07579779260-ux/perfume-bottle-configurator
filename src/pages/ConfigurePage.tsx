import { lazy, Suspense } from 'react'
import { ParamSlider } from '@/components/panel/controls'
import { ExportSection } from '@/components/panel/ExportSection'
import { FitTestSection } from '@/components/panel/FitTestSection'
import { ViewportErrorBoundary } from '@/components/viewport/ViewportErrorBoundary'
import { useT } from '@/i18n/language'
import { cn } from '@/lib/utils'
import { RANGES } from '@/model/config'
import { useDesign } from '@/model/design-context'
import { BOTTLE_PRESETS } from '@/model/options'

// three.js is large; load it only when the configurator opens
const Viewport = lazy(() => import('@/components/viewport/Viewport'))

/** Perfume colours for the preview liquid */
const LIQUIDS = ['#f2c46d', '#f4dfe6', '#cfe8f2', '#d9ecc8', '#e9a07a']

const PROPORTIONS = ['heightExtra', 'shoulderHeight', 'shoulderExtra', 'baseExtra', 'cornerRadius', 'sectionRatio'] as const

// Temporary panel until the step panel arrives: bottle size, Column proportions, fit and liquid colour
function BottlePanel() {
  const t = useT()
  const { config, patch } = useDesign()

  return (
    <div className="space-y-6 p-5">
      <div>
        <h2 className="kicker">{t('panel.bottle')}</h2>
        <div role="group" aria-label={t('panel.bottle')} className="mt-3 flex flex-wrap gap-2">
          {BOTTLE_PRESETS.filter((p) => p !== 'custom').map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={config.bottle.preset === p}
              onClick={() => patch('bottle', { preset: p })}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm transition-colors',
                config.bottle.preset === p ? 'bg-deep text-sand' : 'bg-foam/70 text-deep hover:bg-foam',
              )}
            >
              {p.replace('ml', ' ml')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="kicker">{t('panel.proportions')}</h2>
        {PROPORTIONS.map((key) => (
          <ParamSlider
            key={key}
            label={t(`param.${key}`)}
            value={config.shape[key]}
            range={RANGES.shape[key]}
            onChange={(v) => patch('shape', { [key]: v })}
          />
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="kicker">{t('panel.fit')}</h2>
        <ParamSlider
          label={t('param.clearance')}
          value={config.assembly.clearance}
          range={RANGES.assembly.clearance}
          onChange={(clearance) => patch('assembly', { clearance })}
        />
      </div>

      <div>
        <h2 className="kicker">{t('panel.liquid')}</h2>
        <div role="group" aria-label={t('panel.liquid')} className="mt-3 flex gap-2">
          {LIQUIDS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={config.personal.liquidColour === c}
              onClick={() => patch('personal', { liquidColour: c })}
              style={{ backgroundColor: c }}
              className={cn(
                'size-8 rounded-full ring-offset-2 ring-offset-shell transition-shadow',
                config.personal.liquidColour === c ? 'ring-2 ring-deep' : 'ring-1 ring-rule',
              )}
            />
          ))}
        </div>
      </div>

      <FitTestSection />

      <ExportSection />

      <p className="rounded-lg bg-foam/50 p-3 text-xs text-tide">{t('panel.pending')}</p>
    </div>
  )
}

export function ConfigurePage() {
  const t = useT()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:h-[calc(100dvh-8.5rem)] lg:flex-row">
      <section aria-labelledby="viewport-title" className="h-[60dvh] lg:order-2 lg:h-auto lg:flex-1">
        <h1 id="viewport-title" className="sr-only">
          {t('page.configure.title')}
        </h1>
        <ViewportErrorBoundary message={t('viewport.failed')}>
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center rounded-xl bg-shell">
                <p className="text-sm text-tide">{t('viewport.loading')}</p>
              </div>
            }
          >
            <Viewport />
          </Suspense>
        </ViewportErrorBoundary>
      </section>

      <aside aria-label={t('panel.label')} className="rounded-xl bg-shell shadow-[0_1px_0_var(--rule)] lg:order-1 lg:w-80 lg:overflow-y-auto">
        <BottlePanel />
      </aside>
    </div>
  )
}
