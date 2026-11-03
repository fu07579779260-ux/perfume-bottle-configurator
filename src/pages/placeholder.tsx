import { useT } from '@/i18n/language'

// Shared shell for pages that are not built yet
export function PagePlaceholder({ title, summary }: { title: string; summary: string }) {
  const t = useT()

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-xl text-tide">{summary}</p>
      <p className="mt-8 rounded-xl border border-dashed border-input bg-shell/70 px-5 py-8 text-sm text-tide">
        {t('page.pending')}
      </p>
    </section>
  )
}
