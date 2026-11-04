import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { AssemblySection } from '@/components/panel/AssemblySection'
import { CapSection } from '@/components/panel/CapSection'
import { ParamSlider } from '@/components/panel/controls'
import { ExportSection } from '@/components/panel/ExportSection'
import { FeedbackSection } from '@/components/panel/FeedbackSection'
import { FitTestSection } from '@/components/panel/FitTestSection'
import { PersonalSection, StylePicker } from '@/components/panel/PersonalSection'
import { ProfileEditor } from '@/components/panel/ProfileEditor'
import { PrintSection } from '@/components/panel/PrintSection'
import { ShareSection } from '@/components/panel/ShareSection'
import { SilhouettePicker } from '@/components/panel/SilhouettePicker'
import { TextureSection } from '@/components/panel/TextureSection'
import { ViewportErrorBoundary } from '@/components/viewport/ViewportErrorBoundary'
import { fill, useT } from '@/i18n/language'
import { cn } from '@/lib/utils'
import { RANGES } from '@/model/config'
import { useDesign } from '@/model/design-context'
import { BOTTLE_PRESETS } from '@/model/options'

// three.js is large; load it only when the configurator opens
const Viewport = lazy(() => import('@/components/viewport/Viewport'))

const STEPS = [
  { id: 'bottle', label: 'wizard.bottle.label', title: 'wizard.bottle.title', description: 'wizard.bottle.description' },
  { id: 'shape', label: 'wizard.shape.label', title: 'wizard.shape.title', description: 'wizard.shape.description' },
  { id: 'surface', label: 'wizard.surface.label', title: 'wizard.surface.title', description: 'wizard.surface.description' },
  { id: 'assembly', label: 'wizard.assembly.label', title: 'wizard.assembly.title', description: 'wizard.assembly.description' },
  { id: 'print', label: 'wizard.print.label', title: 'wizard.print.title', description: 'wizard.print.description' },
  { id: 'export', label: 'wizard.export.label', title: 'wizard.export.title', description: 'wizard.export.description' },
] as const

type StepId = (typeof STEPS)[number]['id']

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

function BottleOptions() {
  const t = useT()
  const { config, patch } = useDesign()

  return (
    <div className="space-y-5">
      <div>
        <h2 className="kicker">{t('panel.bottle')}</h2>
        <div role="group" aria-label={t('panel.bottle')} className="mt-3 grid grid-cols-3 gap-2">
          {BOTTLE_PRESETS.filter((p) => p !== 'custom').map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={config.bottle.preset === p}
              onClick={() => patch('bottle', { preset: p })}
              className={cn(
                'rounded-xl px-3 py-4 text-sm transition-colors',
                config.bottle.preset === p ? 'bg-gold font-medium text-canvas' : 'bg-canvas text-ink ring-1 ring-rule hover:bg-soft',
              )}
            >
              {p.replace('ml', ' ml')}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-canvas p-4 ring-1 ring-rule">
        <h3 className="text-sm font-medium text-ink">{t('wizard.bottle.dimensions')}</h3>
        <dl className="mt-3 space-y-2 text-sm">
          {[
            [t('wizard.bottle.diameter'), `${config.bottle.bodyDiameter} mm`],
            [t('wizard.bottle.height'), `${config.bottle.bodyHeight} mm`],
            [t('wizard.bottle.neck'), config.bottle.neckFinish],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right text-ink tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="text-xs leading-relaxed text-muted">{t('wizard.bottle.note')}</p>
    </div>
  )
}

function ShapeOptions() {
  const t = useT()
  const { config, patch } = useDesign()

  return (
    <div className="space-y-6">
      <StylePicker />
      <SilhouettePicker />

      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-canvas px-3 py-2">
        <input
          type="checkbox"
          checked={config.mode.advanced}
          onChange={(e) => patch('mode', { advanced: e.target.checked })}
          className="mt-0.5 size-4 accent-gold"
        />
        <span>
          <span className="block text-sm font-medium text-ink">{t('advanced.switch')}</span>
          <span className="block text-xs text-muted">{t('advanced.switchNote')}</span>
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
        {config.mode.advanced && config.shape.profilePoints && <p className="text-xs text-muted">{t('advanced.slidersNote')}</p>}
        {config.shape.silhouette === 'coral' && (
          <button
            type="button"
            onClick={() => patch('shape', { growthSeed: Math.floor(Math.random() * 10000) })}
            className="rounded-full bg-soft/70 px-3.5 py-1 text-sm text-ink hover:bg-soft"
          >
            {t('shape.newGrowth')}
          </button>
        )}
      </div>

      {config.mode.advanced && <ProfileEditor />}
    </div>
  )
}

function AssemblyOptions() {
  const t = useT()
  const { config, patch } = useDesign()

  return (
    <div className="space-y-6">
      <AssemblySection />
      <div className="space-y-3">
        <h2 className="kicker">{t('panel.fit')}</h2>
        <ParamSlider
          label={t('param.clearance')}
          value={config.assembly.clearance}
          range={RANGES.assembly.clearance}
          onChange={(clearance) => patch('assembly', { clearance })}
        />
      </div>
      <CapSection />
    </div>
  )
}

export function ConfigurePage() {
  const t = useT()
  const [active, setActive] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const focusStep = useRef(false)
  const current = STEPS[active]

  const goTo = (index: number) => {
    if (index === active || index < 0 || index >= STEPS.length) return
    focusStep.current = true
    setActive(index)
  }

  useEffect(() => {
    if (!focusStep.current) return
    focusStep.current = false
    contentRef.current?.scrollTo({ top: 0 })
    headingRef.current?.focus({ preventScroll: true })
    if (window.matchMedia('(max-width: 1023px)').matches && panelRef.current) {
      const headerHeight = document.querySelector('header')?.getBoundingClientRect().height ?? 100
      const navHeight = navRef.current?.getBoundingClientRect().height ?? 0
      const top = panelRef.current.getBoundingClientRect().top + window.scrollY - headerHeight - navHeight - 16
      window.scrollTo({ top: Math.max(0, top) })
    }
  }, [active])

  const panels: Record<StepId, ReactNode> = {
    bottle: <BottleOptions />,
    shape: <ShapeOptions />,
    surface: <><TextureSection /><PersonalSection /></>,
    assembly: <AssemblyOptions />,
    print: <>
      <PrintSection />
      <FitTestSection />
      <details className="rounded-xl border border-rule bg-canvas p-4">
        <summary className="cursor-pointer text-sm font-medium text-ink">{t('wizard.feedback')}</summary>
        <div className="mt-4"><FeedbackSection /></div>
      </details>
    </>,
    export: <><ShareSection onNewDesign={() => goTo(0)} /><ExportSection /></>,
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:h-[calc(100dvh-8.5rem)] lg:min-h-[34rem]">
      <nav ref={navRef} aria-label={t('wizard.nav')} className="sticky top-[6.25rem] z-30 shrink-0 rounded-xl border border-rule/70 bg-canvas/95 p-2 backdrop-blur lg:static">
        <ol className="grid grid-cols-3 gap-1.5 lg:grid-cols-6">
          {STEPS.map((step, index) => (
            <li key={step.id}>
              <button
                id={`configure-button-${step.id}`}
                type="button"
                aria-current={active === index ? 'step' : undefined}
                aria-controls={`configure-step-${step.id}`}
                onClick={() => goTo(index)}
                className={cn(
                  'flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors sm:px-3 sm:text-sm',
                  active === index ? 'bg-gold text-canvas' : 'bg-surface text-muted hover:bg-soft hover:text-ink',
                )}
              >
                <span aria-hidden="true" className={cn('flex size-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] tabular-nums', active === index ? 'bg-canvas/15' : 'bg-soft text-gold')}>
                  {index + 1}
                </span>
                <span>{t(step.label)}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <section aria-labelledby="viewport-title" className="relative h-[40dvh] min-h-64 shrink-0 lg:order-2 lg:h-auto lg:min-h-0 lg:min-w-0 lg:flex-1">
          <h1 id="viewport-title" className="sr-only">{t('page.configure.title')}</h1>
          <ViewportErrorBoundary message={t('viewport.failed')}>
            <Suspense fallback={
              <div className="flex h-full items-center justify-center rounded-xl bg-surface">
                <p className="text-sm text-muted">{t('viewport.loading')}</p>
              </div>
            }>
              <Viewport />
            </Suspense>
          </ViewportErrorBoundary>
        </section>

        {/* Contain hidden form controls within the panel so they cannot extend the page. */}
        <aside ref={panelRef} aria-label={t('panel.label')} className="relative flex min-h-0 flex-col overflow-hidden rounded-xl bg-surface shadow-[0_1px_0_var(--rule)] lg:order-1 lg:w-96 lg:shrink-0">
          <div className="shrink-0 border-b border-rule/70 px-5 pt-5 pb-4">
            <p className="kicker">{fill(t('wizard.step'), { current: String(active + 1), total: String(STEPS.length) })}</p>
            <h2 ref={headingRef} tabIndex={-1} className="mt-2 text-2xl leading-tight text-ink outline-none">{t(current.title)}</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted">{t(current.description)}</p>
            <div aria-hidden="true" className="mt-4 h-0.5 overflow-hidden rounded-full bg-rule">
              <div className="h-full bg-gold" style={{ width: `${((active + 1) / STEPS.length) * 100}%` }} />
            </div>
          </div>

          <div ref={contentRef} className="relative min-h-0 flex-1 p-5 lg:overflow-y-auto">
            {/* Keep panels mounted: names, imported files and fit-test choices survive navigation. */}
            {STEPS.map((step, index) => (
              <section key={step.id} id={`configure-step-${step.id}`} aria-labelledby={`configure-button-${step.id}`} hidden={active !== index} className="space-y-6">
                {panels[step.id]}
              </section>
            ))}
          </div>

          <div className="sticky bottom-0 z-20 shrink-0 border-t border-rule/70 bg-surface px-5 py-4 lg:static">
            <div className="flex items-center gap-2">
              <button type="button" disabled={active === 0} onClick={() => goTo(active - 1)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-soft px-3 py-2.5 text-xs font-medium text-ink hover:bg-rule disabled:cursor-not-allowed disabled:opacity-35">
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                {t('wizard.previous')}
              </button>
              <button type="button" onClick={() => goTo(active === STEPS.length - 1 ? 0 : active + 1)} className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-gold px-3 py-2.5 text-xs font-medium text-canvas hover:bg-accent">
                <span>{active === STEPS.length - 1 ? t('wizard.review') : fill(t('wizard.next'), { name: t(STEPS[active + 1].label) })}</span>
                {active === STEPS.length - 1 ? <RotateCcw aria-hidden="true" className="size-3.5 shrink-0" /> : <ArrowRight aria-hidden="true" className="size-3.5 shrink-0" />}
              </button>
            </div>
            <p className="mt-2 text-center text-[0.65rem] text-muted">{t('wizard.keep')}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
