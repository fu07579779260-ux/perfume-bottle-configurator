import { Copy, ImagePlus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { fill, useLanguage, useT } from '@/i18n/language'
import { STRINGS, type StringKey } from '@/i18n/strings'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'
import { useDesign } from '@/model/design-context'
import { designCode } from '@/model/design-number'
import { diffConfigs, type Change } from '@/model/diff'
import type { DesignVersion, SavedDesign } from '@/persistence/designs'
import { library, useSavedDesigns } from '@/persistence/library'
import { openDesign } from '@/persistence/working'
import { logoStore } from '@/personal/logo-store'

/** Biggest photo kept, so the browser's storage isn't filled by camera originals */
const PHOTO_MAX = 1600

/** Shrink a photo to at most PHOTO_MAX px on its long side, as JPEG. */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, PHOTO_MAX / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * k)
  canvas.height = Math.round(bmp.height * k)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85))
}

function Photo({ id, onRemove }: { id: string; onRemove: () => void }) {
  const t = useT()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let made: string | null = null
    void library.getPhoto(id).then((blob) => {
      if (blob) setUrl((made = URL.createObjectURL(blob)))
    })
    return () => {
      if (made) URL.revokeObjectURL(made)
    }
  }, [id])
  return (
    <div className="relative">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={t('mine.photo')} className="size-20 rounded-md object-cover ring-1 ring-rule" />
        </a>
      ) : (
        <div className="size-20 rounded-md bg-canvas" />
      )}
      <button
        type="button"
        aria-label={t('mine.removePhoto')}
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 rounded-full bg-surface p-0.5 text-muted shadow-sm hover:text-ink"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

const value = (v: unknown, t: (k: StringKey) => string) =>
  Array.isArray(v) ? t('mine.drawn') : v === null ? '—' : typeof v === 'boolean' ? (v ? t('mine.yes') : t('mine.no')) : String(v)

function DiffList({ changes }: { changes: Change[] }) {
  const t = useT()
  const { lang } = useLanguage()
  const label = (c: Change) => STRINGS[lang][`param.${c.key}` as StringKey] ?? `${c.section} · ${c.key}`
  if (!changes.length) return <p className="text-xs text-muted">{t('mine.noChanges')}</p>
  return (
    <ul className="space-y-0.5 text-xs">
      {changes.map((c) => (
        <li key={`${c.section}.${c.key}`} className="flex flex-wrap gap-x-2">
          <span className="text-muted">{label(c)}</span>
          <span className="text-ink tabular-nums">
            {value(c.from, t)} → {value(c.to, t)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function VersionRow({ design, version, onOpen, compare, onCompare }: {
  design: SavedDesign
  version: DesignVersion
  onOpen: () => void
  compare: boolean
  onCompare: () => void
}) {
  const t = useT()
  const [note, setNote] = useState(version.note)
  useEffect(() => setNote(version.note), [version.note])

  return (
    <li className="flex gap-3 rounded-lg bg-canvas p-3">
      {version.thumbnail ? (
        <img src={version.thumbnail} alt="" className="h-24 w-20 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="h-24 w-20 shrink-0 rounded-md bg-soft/60" />
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium text-ink">v{version.n}</span>
          <span className="font-mono text-xs text-gold">{designCode(version.config)}</span>
          <span className="text-xs text-muted">{new Date(version.savedAt).toLocaleString()}</span>
          <label className="ml-auto flex items-center gap-1 text-xs text-muted">
            <input type="checkbox" checked={compare} onChange={onCompare} className="accent-gold" />
            {t('mine.compare')}
          </label>
        </div>
        {version.feedback && (
          <p className="text-xs text-muted">
            {fill(t('mine.feedback'), {
              shell: t(`feedback.shell.${version.feedback.shell}`),
              cap: t(`feedback.cap.${version.feedback.cap}`),
            })}
          </p>
        )}
        <textarea
          value={note}
          rows={2}
          aria-label={fill(t('mine.noteFor'), { n: String(version.n) })}
          placeholder={t('mine.notePlaceholder')}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== version.note && void library.updateVersion(design.id, version.n, { note })}
          className="w-full resize-y rounded-md bg-surface px-2 py-1.5 text-sm text-ink ring-1 ring-rule focus:ring-2 focus:ring-gold focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          {version.photos.map((p) => (
            <Photo key={p} id={p} onRemove={() => void library.removePhoto(design.id, version.n, p)} />
          ))}
          <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-input text-[0.7rem] text-muted hover:bg-soft/50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold">
            <ImagePlus className="size-4" />
            {t('mine.addPhoto')}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void shrink(file).then((blob) => library.addPhoto(design.id, version.n, blob))
              }}
            />
          </label>
        </div>
        <Button size="sm" onClick={onOpen} className="rounded-full">
          {t('mine.open')}
        </Button>
      </div>
    </li>
  )
}

function DesignCard({ design }: { design: SavedDesign }) {
  const t = useT()
  const { load } = useDesign()
  const [expanded, setExpanded] = useState(false)
  const [picked, setPicked] = useState<number[]>([])
  const latest = design.versions[design.versions.length - 1]

  const openVersion = (v: DesignVersion) => {
    load(v.config)
    openDesign.set({ id: design.id, n: v.n })
    logoStore.set(v.logo)
    window.location.hash = href('/configure')
  }
  const toggle = (n: number) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n].slice(-2)))
  const pair = picked.length === 2 ? picked.map((n) => design.versions.find((v) => v.n === n)!).sort((a, b) => a.n - b.n) : null

  return (
    <li className="rounded-xl bg-surface p-4 shadow-[0_1px_0_var(--rule)]">
      <div className="flex gap-4">
        {latest.thumbnail ? (
          <img src={latest.thumbnail} alt="" className="h-28 w-24 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="h-28 w-24 shrink-0 rounded-lg bg-soft/60" />
        )}
        <div className="min-w-0 flex-1">
          <input
            defaultValue={design.name}
            aria-label={t('mine.name')}
            onBlur={(e) => e.target.value !== design.name && void library.rename(design.id, e.target.value)}
            className="w-full rounded-md bg-transparent font-display text-xl text-ink outline-none focus:bg-canvas focus:px-2"
          />
          <p className="mt-1 text-xs text-muted">
            {fill(t('mine.summary'), {
              n: String(design.versions.length),
              shape: t(`sil.${latest.config.shape.silhouette}`),
              date: new Date(latest.savedAt).toLocaleDateString(),
            })}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Button size="sm" onClick={() => openVersion(latest)} className="rounded-full">
              {fill(t('mine.openLatest'), { n: String(latest.n) })}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setExpanded((e) => !e)} className="rounded-full" aria-expanded={expanded}>
              {expanded ? t('mine.hideVersions') : t('mine.versions')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void library.duplicate(design.id, (n) => fill(t('mine.copyName'), { name: n }))}
              className="rounded-full"
            >
              <Copy className="size-3.5" />
              {t('mine.duplicate')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.confirm(fill(t('mine.deleteConfirm'), { name: design.name })) && void library.remove(design.id)}
              className="rounded-full text-warn"
            >
              <Trash2 className="size-3.5" />
              {t('mine.delete')}
            </Button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {pair && (
            <div className="rounded-lg bg-soft/50 p-3">
              <p className="mb-1.5 text-sm font-medium text-ink">{fill(t('mine.changes'), { a: String(pair[0].n), b: String(pair[1].n) })}</p>
              <DiffList changes={diffConfigs(pair[0].config, pair[1].config)} />
            </div>
          )}
          {picked.length === 1 && <p className="text-xs text-muted">{t('mine.pickAnother')}</p>}
          <ul className="space-y-2">
            {[...design.versions].reverse().map((v) => (
              <VersionRow
                key={v.n}
                design={design}
                version={v}
                onOpen={() => openVersion(v)}
                compare={picked.includes(v.n)}
                onCompare={() => toggle(v.n)}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}

export function MyDesignsPage() {
  const t = useT()
  const designs = useSavedDesigns()

  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{t('page.myDesigns.title')}</h1>
      <p className="mt-3 max-w-xl text-muted">{t('mine.lead')}</p>
      {designs.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-input bg-surface/70 px-5 py-8 text-sm text-muted">
          <p>{t('mine.empty')}</p>
          <Button asChild className="mt-4 rounded-full">
            <a href={href('/configure')}>{t('home.start')}</a>
          </Button>
        </div>
      ) : (
        <ul className={cn('mt-8 space-y-4')}>
          {designs.map((d) => (
            <DesignCard key={d.id} design={d} />
          ))}
        </ul>
      )}
    </section>
  )
}
