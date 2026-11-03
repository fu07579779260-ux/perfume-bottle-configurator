import { Download } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { downloadFile } from '@/export/download'
import { shellFileName } from '@/export/file-names'
import { toBinaryStl } from '@/export/stl'
import { loadManifold } from '@/geometry/manifold-loader'
import { capMagnetPlan, jointInfo, layoutForPrint, printParts } from '@/geometry/parts'
import { checkWall } from '@/geometry/shell'
import { fill, useT } from '@/i18n/language'
import type { StringKey } from '@/i18n/strings'
import { useDesign } from '@/model/design-context'

/** Higher resolution than the preview, so curves print smoothly */
const EXPORT_SEGMENTS = 192

export function ExportSection() {
  const t = useT()
  const { config } = useDesign()
  const [last, setLast] = useState<{ name: string; triangles: number; kb: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const wall = checkWall(config)
  const joint = jointInfo(config)
  const capMagnets = capMagnetPlan(config)
  const tech = config.manufacturing.technology
  const method = config.assembly.method

  const exportStl = async () => {
    setBusy(true)
    setFailed(false)
    try {
      // The geometry kernel cuts the halves, holes and slots
      const wasm = await loadManifold()
      const mesh = layoutForPrint(printParts(wasm, config, EXPORT_SEGMENTS))
      const name = shellFileName(config)
      const stl = toBinaryStl(mesh, `Perfume bottle shell - ${name}`)
      downloadFile(stl, name, 'model/stl')
      setLast({ name, triangles: mesh.indices.length / 3, kb: Math.round(stl.byteLength / 1024) })
    } catch (error) {
      console.error('Export failed', error)
      setFailed(true)
    } finally {
      setBusy(false)
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
      <Button onClick={() => void exportStl()} disabled={busy} className="w-full rounded-full">
        <Download aria-hidden="true" />
        {busy ? t('export.building') : t('export.stl')}
      </Button>

      <div role="status" className="space-y-1 text-xs">
        {failed && <p className="font-medium text-coral-ink">{t('export.failed')}</p>}
        {method === 'halves' && !joint.fits && <p className="font-medium text-coral-ink">{t('export.noJoint')}</p>}
        {!wall.ok && <p className="font-medium text-coral-ink">{t('export.thinWarning')}</p>}
        {last && (
          <p className="text-tide">
            <span className="break-all text-deep">{last.name}</span> ·{' '}
            {fill(t('export.saved'), { triangles: last.triangles.toLocaleString(), kb: String(last.kb) })}
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
