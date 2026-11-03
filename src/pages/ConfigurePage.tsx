import { lazy, Suspense } from 'react'
import { AssemblySection } from '@/components/panel/AssemblySection'
import { CapSection } from '@/components/panel/CapSection'
import { ParamSlider } from '@/components/panel/controls'
import { ExportSection } from '@/components/panel/ExportSection'
import { FitTestSection } from '@/components/panel/FitTestSection'
import { PersonalSection } from '@/components/panel/PersonalSection'
import { ProfileEditor } from '@/components/panel/ProfileEditor'
import { PrintSection } from '@/components/panel/PrintSection'
import { SilhouettePicker } from '@/components/panel/SilhouettePicker'
import { TextureSection } from '@/components/panel/TextureSection'
import { ViewportErrorBoundary } from '@/components/viewport/ViewportErrorBoundary'
import { useT } from '@/i18n/language'
import { cn } from '@/lib/utils'
import { RANGES } from '@/model/config'
import { useDesign } from '@/model/design-context'
import { BOTTLE_PRESETS } from '@/model/options'

// three.js is large; load it only when the configurator opens
const Viewport = lazy(() => import('@/components/viewport/Viewport'))

type ShapeSlider =
  | 'heightExtra'
  | 'shoulderHeight'
  | 'shoulderExtra'
  | 'baseExtra'
  | 'cornerRadius'
  | 'sectionRatio'
  | 'prismSides'
  | 'prismTwist'
  | 'strutCount'
  | 'strutWidth'
  | 'holeDensity'
  | 'grooveDepth'

const COMMON: ShapeSlider[] = ['heightExtra', 'shoulderHeight', 'shoulderExtra', 'baseExtra', 'cornerRadius']
/** Extra sliders that only mean something for one silhouette */
const SPECIFIC: Partial<Record<string, ShapeSlider[]>> = {
  column: ['sectionRatio'],
  pebble: ['sectionRatio'],
  prism: ['prismSides', 'prismTwist'],
  exoskeleton: ['strutCount', 'strutWidth'],
  coral: ['grooveDepth', 'holeDensity'],
}

// Temporary panel until the step panel arrives: bottle, silhouette, proportions, fit and liquid colour
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

      <SilhouettePicker />

      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-sand px-3 py-2">
        <input
          type="checkbox"
          checked={config.mode.advanced}
          onChange={(e) => patch('mode', { advanced: e.target.checked })}
          className="mt-0.5 size-4 accent-lagoon"
        />
        <span>
          <span className="block text-sm font-medium text-deep">{t('advanced.switch')}</span>
          <span className="block text-xs text-tide">{t('advanced.switchNote')}</span>
        </span>
      </label>

      <div className="space-y-3">
        <h2 className="kicker">{t('panel.proportions')}</h2>
        {[...COMMON, ...(SPECIFIC[config.shape.silhouette] ?? [])].map((key) => (
          <ParamSlider
            key={key}
            label={t(`param.${key}`)}
            value={config.shape[key]}
            range={RANGES.shape[key]}
            onChange={(v) => patch('shape', { [key]: v })}
          />
        ))}
        {config.mode.advanced && config.shape.profilePoints && <p className="text-xs text-tide">{t('advanced.slidersNote')}</p>}
        {config.shape.silhouette === 'coral' && (
          <button
            type="button"
            onClick={() => patch('shape', { growthSeed: Math.floor(Math.random() * 10000) })}
            className="rounded-full bg-foam/70 px-3.5 py-1 text-sm text-deep hover:bg-foam"
          >
            {t('shape.newGrowth')}
          </button>
        )}
      </div>

      {config.mode.advanced && <ProfileEditor />}

      <TextureSection />

      <AssemblySection />

      <CapSection />

      <div className="space-y-3">
        <h2 className="kicker">{t('panel.fit')}</h2>
        <ParamSlider
          label={t('param.clearance')}
          value={config.assembly.clearance}
          range={RANGES.assembly.clearance}
          onChange={(clearance) => patch('assembly', { clearance })}
        />
      </div>

      <PersonalSection />

      <PrintSection />

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
