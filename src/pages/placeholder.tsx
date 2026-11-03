// Shared shell for pages that are not built yet
export function PagePlaceholder({ title, summary }: { title: string; summary: string }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted-foreground">{summary}</p>
    </section>
  )
}
