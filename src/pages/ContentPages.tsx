import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CASES } from '@/content/cases'
import { GUIDE } from '@/content/guide'
import { useLanguage, useT } from '@/i18n/language'
import { href } from '@/lib/router'

export function InspirationPage() {
  const t = useT()
  const { lang } = useLanguage()

  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <p className="kicker">{t('inspiration.kicker')}</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">{t('page.inspiration.title')}</h1>
      <p className="mt-3 max-w-2xl text-tide">{t('inspiration.lead')}</p>
      <ol className="mt-8 space-y-3">
        {CASES.map((c, i) => (
          <li key={c.id} className="grid gap-4 rounded-xl bg-shell p-5 shadow-[0_1px_0_var(--rule)] sm:grid-cols-[2.5rem_1fr]">
            <span className="font-display text-2xl text-lagoon tabular-nums">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h2 className="text-lg font-medium text-deep">
                {c.name} <span className="ml-1 text-sm font-normal text-tide">{c.year}</span>
              </h2>
              <p className="mt-1.5 text-sm text-tide">{c.what[lang]}</p>
              <p className="mt-2 rounded-lg bg-foam/50 px-3 py-2 text-sm text-deep">
                <span className="font-medium">{t('inspiration.took')}</span> {c.took[lang]}
              </p>
              <a
                href={c.source}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-lagoon underline-offset-2 hover:underline"
              >
                {t('inspiration.source')}
                <ExternalLink aria-hidden="true" className="size-3" />
              </a>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-xs text-tide">{t('inspiration.note')}</p>
    </section>
  )
}

export function GuidePage() {
  const t = useT()
  const { lang } = useLanguage()

  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <p className="kicker">{t('guide.kicker')}</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">{t('page.guide.title')}</h1>
      <p className="mt-3 max-w-2xl text-tide">{t('guide.lead')}</p>

      <nav aria-label={t('guide.contents')} className="mt-6 flex flex-wrap gap-1.5">
        {GUIDE.map((s) => (
          <a
            key={s.id}
            href={`#/guide`}
            onClick={(e) => {
              // The hash is the route here, so scroll by hand
              e.preventDefault()
              document.getElementById(`guide-${s.id}`)?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="rounded-full bg-foam/70 px-3 py-1 text-xs text-deep hover:bg-foam"
          >
            {s.title[lang]}
          </a>
        ))}
      </nav>

      <div className="mt-8 space-y-4">
        {GUIDE.map((s) => (
          <article key={s.id} id={`guide-${s.id}`} className="scroll-mt-28 rounded-xl bg-shell p-5 shadow-[0_1px_0_var(--rule)]">
            <h2 className="text-xl font-medium text-deep">{s.title[lang]}</h2>
            <ol className="mt-3 space-y-2">
              {s.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-deep">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-foam text-xs font-semibold text-lagoon">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step[lang]}</span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>

      <Button asChild className="mt-8 rounded-full">
        <a href={href('/configure')}>{t('guide.toConfigurator')}</a>
      </Button>
    </section>
  )
}
