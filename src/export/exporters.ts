import JSZip from 'jszip'
import type { Marks } from '@/geometry/marks'
import { loadManifold } from '@/geometry/manifold-loader'
import { layoutForPrint, layoutParts, partForPrint, printParts, type Part, type PartId } from '@/geometry/parts'
import { STRINGS, type Language, type StringKey } from '@/i18n/strings'
import type { DesignConfig } from '@/model/config'
import { designCode } from '@/model/design-number'
import { buildShareUrl } from '@/model/serialize'
import { loadRhino } from './load-rhino'
import { glassReference, write3dm } from './rhino'
import { designCard, specSheetPdf } from './sheets'
import { toBinaryStl } from './stl'
import { designSummary } from './summary'
import { write3mf } from './threemf'

// Every download the app offers, each returning the file to save.

export type ExportFormat = 'stl' | '3mf' | 'zip' | '3dm' | 'png' | 'pdf'

export interface ExportFile {
  data: BlobPart
  name: string
  type: string
}

/** Higher resolution than the preview, so curves print smoothly */
const EXPORT_SEGMENTS = 192

/** e.g. perfume-PB-7K3QX-teardrop */
const baseName = (c: DesignConfig) => `perfume-${designCode(c)}-${c.shape.silhouette}`

const partName = (id: PartId, lang: Language) => STRINGS[lang][`partName.${id}` as StringKey]
const partColour = (c: DesignConfig, id: PartId) => (id === 'cap' ? c.personal.capColour : id === 'dowel' ? '#b8b8b8' : c.personal.shellColour)

/** Numbered names when a part comes more than once (the dowels). */
function named(parts: Part[], lang: Language) {
  const seen = new Map<PartId, number>()
  return parts.map((p) => {
    const n = (seen.get(p.id) ?? 0) + 1
    seen.set(p.id, n)
    const many = parts.filter((q) => q.id === p.id).length > 1
    return { part: p, name: many ? `${partName(p.id, lang)} ${n}` : partName(p.id, lang) }
  })
}

export async function exportDesign(format: ExportFormat, config: DesignConfig, marks: Marks, lang: Language): Promise<ExportFile> {
  const base = baseName(config)
  const title = `${STRINGS[lang]['app.title']} ${designCode(config)}`
  const shareUrl = buildShareUrl(config, window.location.href).url

  if (format === 'png' || format === 'pdf') {
    const summary = designSummary(config, lang)
    return format === 'png'
      ? { data: await designCard(summary, shareUrl, lang), name: `${base}-card.png`, type: 'image/png' }
      : { data: await specSheetPdf(summary, shareUrl, lang), name: `${base}-spec.pdf`, type: 'application/pdf' }
  }

  const wasm = await loadManifold()
  const parts = printParts(wasm, config, EXPORT_SEGMENTS, marks)

  switch (format) {
    case 'stl':
      return { data: toBinaryStl(layoutForPrint(parts), title), name: `${base}.stl`, type: 'model/stl' }
    case '3mf': {
      const laid = named(layoutParts(parts), lang).map(({ part, name }) => ({ name, colour: partColour(config, part.id), mesh: part.mesh }))
      return { data: await write3mf(laid, title), name: `${base}.3mf`, type: 'model/3mf' }
    }
    case 'zip': {
      const zip = new JSZip()
      for (const { part, name } of named(parts, lang)) {
        zip.file(`${base}-${name.toLowerCase().replace(/\s+/g, '-')}.stl`, toBinaryStl(partForPrint(part), `${title} – ${name}`))
      }
      return { data: await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }), name: `${base}-parts.zip`, type: 'application/zip' }
    }
    case '3dm': {
      const rhino = await loadRhino()
      const layers = named(parts, lang).map(({ part, name }) => ({ name, colour: partColour(config, part.id), mesh: part.mesh }))
      layers.push({ name: STRINGS[lang]['partName.glass'], colour: '#cfe3df', mesh: glassReference(config.bottle) })
      return { data: write3dm(rhino, layers, title), name: `${base}.3dm`, type: 'application/octet-stream' }
    }
  }
}
