import { Download } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { downloadFile } from '@/export/download'
import { fitRingsFileName } from '@/export/file-names'
import { toBinaryStl } from '@/export/stl'
import { fitTestRings, type FitRing } from '@/geometry/fit-rings'
import { fill, useT } from '@/i18n/language'
import type { StringKey } from '@/i18n/strings'
import { cn } from '@/lib/utils'
import { useDesign } from '@/model/design-context'

function RingChoice({ label, rings, value, onPick }: {
  label: string
  rings: FitRing[]
  value: number
  onPick: (clearance: number) => void
}) {
  const t = useT()
  return (
    <div>
      <p className="text-sm text-deep">{label}</p>
      <div role="group" aria-label={label} className="mt-1.5 grid grid-cols-5 gap-1.5">
        {rings.map((r) => {
          const active = Math.abs(r.clearance - value) < 1e-6
          return (
            <button
              key={r.index}
              type="button"
              aria-pressed={active}
              aria-label={fill(t('fit.ringLabel'), {
                n: String(r.index),
                h: String(r.height),
                c: r.clearance.toFixed(2),
              })}
              onClick={() => onPick(r.clearance)}
              className={cn(
                'rounded-lg py-1.5 text-center leading-tight transition-colors',
                active ? 'bg-deep text-sand' : 'bg-foam/70 text-deep hover:bg-foam',
              )}
            >
              <span className="block text-sm font-medium">{r.index}</span>
              <span className={cn('block text-[0.65rem] tabular-nums', active ? 'text-sand/80' : 'text-tide')}>
                {r.clearance.toFixed(2)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function FitTestSection() {
  const t = useT()
  const { config, patch } = useDesign()
  const current = fitTestRings(config, 16)
  // Keep the ladder that was printed: picking a ring recentres the current one
  const [printed, setPrinted] = useState<{ body: FitRing[]; collar: FitRing[]; bedSize: string } | null>(null)
  const shown = printed ?? { body: current.body, collar: current.collar }

  const exportRings = () => {
    const test = fitTestRings(config)
    downloadFile(toBinaryStl(test.mesh, 'Perfume bottle fit test rings'), fitRingsFileName(config), 'model/stl')
    setPrinted({
      body: test.body,
      collar: test.collar,
      bedSize: `${test.bed.width.toFixed(0)} × ${test.bed.depth.toFixed(0)} mm`,
    })
  }

  return (
    <div className="space-y-3">
      <h2 className="kicker">{t('fit.title')}</h2>
      <p className="text-xs text-tide">{t('fit.intro')}</p>
      <Button onClick={exportRings} variant="secondary" className="w-full rounded-full">
        <Download aria-hidden="true" />
        {t('fit.download')}
      </Button>
      <p role="status" className="text-xs text-tide">
        {printed
          ? fill(t('fit.printed'), { bed: printed.bedSize })
          : fill(t('fit.bed'), { bed: `${current.bed.width.toFixed(0)} × ${current.bed.depth.toFixed(0)} mm` })}
      </p>

      <ol className="list-decimal space-y-1 pl-4 text-xs text-tide">
        {[1, 2, 3].map((n) => (
          <li key={n}>{t(`fit.how.${n}` as StringKey)}</li>
        ))}
      </ol>

      <RingChoice
        label={t('fit.bestBody')}
        rings={shown.body}
        value={config.assembly.clearance}
        onPick={(clearance) => patch('assembly', { clearance })}
      />
      <RingChoice
        label={t('fit.bestCollar')}
        rings={shown.collar}
        value={config.cap.clearance}
        onPick={(clearance) => patch('cap', { clearance })}
      />
    </div>
  )
}
