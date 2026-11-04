import { Download } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { downloadFile } from '@/export/download'
import { exportDesign, type ExportFormat } from '@/export/exporters'
import { capMagnetPlan, jointInfo } from '@/geometry/parts'
import { checkWall } from '@/geometry/shell'
import { fill, useLanguage, useT } from '@/i18n/language'
import type { StringKey } from '@/i18n/strings'
import { useDesign } from '@/model/design-context'
import { useMarks } from '@/personal/use-marks'

/** The other formats, after the main STL button */
const MORE: ExportFormat[] = ['3mf', 'zip', '3dm', 'pdf', 'png']

export function ExportSection() {
  const t = useT()
  const { lang } = useLanguage()
  const { config } = useDesign()
  const marks = useMarks(config)
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [last, setLast] = useState<{ name: string; kb: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const wall = checkWall(config)
  const joint = jointInfo(config)
  const capMagnets = capMagnetPlan(config)
  const tech = config.manufacturing.technology
  const method = config.assembly.method

  const run = async (format: ExportFormat) => {
    setBusy(format)
    setFailed(false)
    try {
      const file = await exportDesign(format, config, marks, lang)
      downloadFile(file.data, file.name, file.type)
      const size = file.data instanceof Blob ? file.data.size : (file.data as ArrayBuffer | Uint8Array).byteLength
      setLast({ name: file.name, kb: Math.round(size / 1024) })
    } catch (error) {
      console.error('Export failed', error)
      setFailed(true)
    } finally {
      setBusy(null)
    }
  }

  const partsLine =
    method !== 'halves'
      ? t(`export.parts.${method}`)
      : joint.kind === 'magnets'
        ? fill(t('export.parts.halves.magnets'), { n: String(joint.count), d: String(joint.diameter), h: String(joint.length) })
        : joint.fits
          ? fill(t('export.parts.halves.dowels'), { n: String(joint.count), d: String(joint.diameter) })
          : t('export.parts.halves.glue')

  return (
    <div className="space-y-3">
      <h2 className="kicker">{t('export.title')}</h2>
      <p className="text-xs text-tide">
        {partsLine}
        {capMagnets?.fits && (
          <> {fill(t('export.capMagnets'), { d: String(config.assembly.magnetDiameter), h: String(config.assembly.magnetHeight) })}</>
        )}
      </p>
      <Button onClick={() => void run('stl')} disabled={busy !== null} className="w-full rounded-full">
        <Download aria-hidden="true" />
        {busy === 'stl' ? t('export.building') : t('export.stl')}
      </Button>
      <div className="grid grid-cols-2 gap-1.5">
        {MORE.map((f) => (
          <button
            key={f}
            type="button"
            disabled={busy !== null}
            onClick={() => void run(f)}
            className="rounded-lg bg-foam/70 px-2.5 py-1.5 text-left text-xs text-deep hover:bg-foam disabled:opacity-50"
          >
            <span className="block font-medium">{busy === f ? t('export.building') : t(`export.format.${f}` as StringKey)}</span>
            <span className="block text-[0.7rem] text-tide">{t(`export.format.${f}.note` as StringKey)}</span>
          </button>
        ))}
      </div>

      <div role="status" className="space-y-1 text-xs">
        {failed && <p className="font-medium text-coral-ink">{t('export.failed')}</p>}
        {method === 'halves' && !joint.fits && <p className="font-medium text-coral-ink">{t('export.noJoint')}</p>}
        {!wall.ok && <p className="font-medium text-coral-ink">{t('export.thinWarning')}</p>}
        {last && (
          <p className="text-tide">
            <span className="break-all text-deep">{last.name}</span> · {last.kb} KB
          </p>
        )}
      </div>

      <div className="rounded-lg bg-foam/50 p-3 text-xs text-deep">
        <p className="font-medium">{t('export.tips')}</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-tide">
          {[1, 2, 3].map((n) => (
            <li key={n}>{t(`export.tip.${tech}.${n}` as StringKey)}</li>
          ))}
          <li>{t(`export.assembly.${method}`)}</li>
        </ul>
      </div>
    </div>
  )
}
