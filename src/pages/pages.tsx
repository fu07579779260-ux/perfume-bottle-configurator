import { Button } from '@/components/ui/button'
import { href } from '@/lib/router'
import { PagePlaceholder } from './placeholder'

export function HomePage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Perfume Bottle Configurator</h1>
      <p className="mt-2 text-muted-foreground">
        A standard glass bottle inside a 3D-printed shell and cap you design yourself.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Silhouette → proportions → texture → cap → personalise → preview → 3D print → assemble.
      </p>
      <Button asChild className="mt-6">
        <a href={href('/configure')}>Start designing</a>
      </Button>
    </section>
  )
}

export function ConfigurePage() {
  return <PagePlaceholder title="Configurator" summary="Step panel beside a live 3D preview, with an Advanced switch." />
}

export function InspirationPage() {
  return <PagePlaceholder title="Inspiration" summary="Reference cases and what each one inspired in the app." />
}

export function GuidePage() {
  return <PagePlaceholder title="Print & assembly guide" summary="Printing per technology, fit test rings, post-processing and assembly." />
}

export function MyDesignsPage() {
  return <PagePlaceholder title="My designs" summary="Saved designs with versions, notes, photos and fit feedback." />
}
