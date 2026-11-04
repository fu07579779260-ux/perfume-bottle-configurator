import { Button } from '@/components/ui/button'
import { SilhouetteSketch } from '@/components/layout/SilhouetteSketch'
import { useT } from '@/i18n/language'
import type { StringKey } from '@/i18n/strings'
import { href } from '@/lib/router'
import { DEFAULT_CONFIG } from '@/model/config'
import { useDesign } from '@/model/design-context'
import { SILHOUETTES } from '@/model/options'
import { applyStyle, STYLES, type Style } from '@/model/styles'
import { openDesign } from '@/persistence/working'
import { logoStore } from '@/personal/logo-store'

/** Example designs: each style applied to the default bottle */
const EXAMPLES = STYLES.map((style) => ({ style, config: applyStyle(structuredClone(DEFAULT_CONFIG), style) }))

const FLOW = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `home.flow.${n}` as StringKey)

const LAYERS = [
  { key: 'glass', swatch: 'bg-foam border border-dashed border-tide' },
  { key: 'shell', swatch: 'bg-lagoon' },
  { key: 'cap', swatch: 'bg-coral' },
] as const

export function HomePage() {
  const t = useT()
  const { load } = useDesign()

  const startFrom = (style: Style) => {
    load(EXAMPLES.find((e) => e.style === style)!.config)
    openDesign.set(null)
    logoStore.set(null)
    window.location.hash = href('/configure')
  }

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-12 sm:py-20">
        <p className="kicker">{t('home.kicker')}</p>
        <h1 className="mt-4 max-w-3xl text-4xl leading-[1.1] font-medium tracking-tight text-balance sm:text-6xl">
          {t('home.title')}
        </h1>
        <p className="mt-5 max-w-xl text-lg text-tide">{t('home.lead')}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-full px-7">
            <a href={href('/configure')}>{t('home.start')}</a>
          </Button>
          <Button asChild size="lg" variant="ghost" className="rounded-full px-6 text-deep">
            <a href={href('/guide')}>{t('home.guide')}</a>
          </Button>
        </div>
      </section>

      <section aria-labelledby="layers">
        <h2 id="layers" className="kicker">
          {t('home.layers')}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {LAYERS.map(({ key, swatch }) => (
            <li key={key} className="flex gap-4 rounded-xl bg-shell p-5 shadow-[0_1px_0_var(--rule)]">
              <span className={`mt-1 size-4 shrink-0 rounded-full ${swatch}`} />
              <div>
                <h3 className="text-lg font-medium">{t(`home.layer.${key}`)}</h3>
                <p className="mt-1 text-sm text-tide">{t(`home.layer.${key}.text`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="flow" className="mt-14">
        <h2 id="flow" className="kicker">
          {t('home.flow')}
        </h2>
        <ol className="mt-4 flex flex-wrap gap-2">
          {FLOW.map((key, i) => (
            <li key={key} className="flex items-center gap-2 rounded-full bg-foam/70 py-1.5 pr-4 pl-1.5 text-sm">
              <span className="grid size-6 place-items-center rounded-full bg-shell text-xs font-semibold text-lagoon">
                {i + 1}
              </span>
              {t(key)}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="silhouettes" className="mt-14">
        <h2 id="silhouettes" className="kicker">
          {t('home.silhouettes')}
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SILHOUETTES.map((s) => (
            <li key={s} className="rounded-xl bg-shell p-4 text-center shadow-[0_1px_0_var(--rule)]">
              <SilhouetteSketch silhouette={s} />
              <h3 className="mt-3 font-medium">{t(`sil.${s}`)}</h3>
              <p className="mt-1 text-xs text-tide">{t(`sil.${s}.note`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="examples" className="mt-14">
        <h2 id="examples" className="kicker">
          {t('home.examples')}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-tide">{t('home.examples.lead')}</p>
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {EXAMPLES.map(({ style, config }) => (
            <li key={style} className="flex flex-col rounded-xl bg-shell p-4 shadow-[0_1px_0_var(--rule)]">
              <div className="flex items-center gap-3">
                <SilhouetteSketch silhouette={config.shape.silhouette} className="h-16 w-auto shrink-0" />
                <span
                  aria-hidden="true"
                  className="size-6 shrink-0 rounded-full ring-1 ring-rule"
                  style={{ background: `linear-gradient(135deg, ${config.personal.shellColour} 50%, ${config.personal.capColour} 50%)` }}
                />
              </div>
              <h3 className="mt-3 font-medium">{t(`style.${style}`)}</h3>
              <p className="mt-1 flex-1 text-xs text-tide">{t(`style.${style}.note` as StringKey)}</p>
              <Button size="sm" variant="secondary" onClick={() => startFrom(style)} className="mt-3 rounded-full">
                {t('home.startFrom')}
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
