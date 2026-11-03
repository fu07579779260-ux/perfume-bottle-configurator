import { Download } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { downloadFile } from '@/export/download'
import { shellFileName } from '@/export/file-names'
import { toBinaryStl } from '@/export/stl'
import { buildShellMesh, checkWall } from '@/geometry/shell'
import { fill, useT } from '@/i18n/language'
import type { StringKey } from '@/i18n/strings'
import { useDesign } from '@/model/design-context'

/** Higher resolution than the preview, so curves print smoothly */
const EXPORT_SEGMENTS = 192

export function ExportSection() {
  const t = useT()
  const { config } = useDesign()
  const [last, setLast] = useState<{ name: string; triangles: number; kb: number } | null>(null)
  const wall = checkWall(config)
  const tech = config.manufacturing.technology

  const exportStl = () => {
    const mesh = buildShellMesh(config, EXPORT_SEGMENTS)
    const name = shellFileName(config)
    const stl = toBinaryStl(mesh, `Perfume bottle shell - ${name}`)
    downloadFile(stl, name, 'model/stl')
    setLast({ name, triangles: mesh.indices.length / 3, kb: Math.round(stl.byteLength / 1024) })
  }

  return (
    <div className="space-y-3">
      <h2 className="kicker">{t('export.title')}</h2>
      <Button onClick={exportStl} className="w-full rounded-full">
        <Download aria-hidden="true" />
        {t('export.stl')}
      </Button>

      <div role="status" className="space-y-1 text-xs">
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
        </ul>
      </div>
    </div>
  )
}
