import JSZip from 'jszip'
import type { MeshData } from '@/geometry/mesh'

// 3MF (the format newer slicers such as Bambu Studio and PrusaSlicer prefer):
// a ZIP with an XML model. Every part is its own object with its name and
// colour, laid out on the bed, in millimetres. The scene is Y-up; 3MF is Z-up,
// so (x, y, z) is written as (x, −z, y), as in the STL export.

export interface ThreeMfPart {
  name: string
  /** Hex colour, e.g. "#e6d8bf" */
  colour: string
  mesh: MeshData
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const num = (v: number) => (Math.abs(v) < 1e-6 ? '0' : v.toFixed(4).replace(/\.?0+$/, ''))

export function threeMfModel(parts: ThreeMfPart[], title: string): string {
  const colours = [...new Set(parts.map((p) => p.colour.toUpperCase()))]
  const out: string[] = []
  out.push('<?xml version="1.0" encoding="UTF-8"?>')
  out.push('<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">')
  out.push(`<metadata name="Title">${escape(title)}</metadata>`)
  out.push('<metadata name="Application">Perfume Bottle Configurator</metadata>')
  out.push('<resources>')
  out.push('<basematerials id="1">')
  for (const c of colours) out.push(`<base name="${c}" displaycolor="${c}FF"/>`)
  out.push('</basematerials>')
  parts.forEach((part, i) => {
    const { positions: p, indices: ix } = part.mesh
    out.push(`<object id="${i + 2}" type="model" name="${escape(part.name)}" pid="1" pindex="${colours.indexOf(part.colour.toUpperCase())}">`)
    out.push('<mesh><vertices>')
    for (let v = 0; v < p.length; v += 3) out.push(`<vertex x="${num(p[v])}" y="${num(-p[v + 2])}" z="${num(p[v + 1])}"/>`)
    out.push('</vertices><triangles>')
    for (let t = 0; t < ix.length; t += 3) out.push(`<triangle v1="${ix[t]}" v2="${ix[t + 1]}" v3="${ix[t + 2]}"/>`)
    out.push('</triangles></mesh></object>')
  })
  out.push('</resources><build>')
  parts.forEach((_, i) => out.push(`<item objectid="${i + 2}"/>`))
  out.push('</build></model>')
  return out.join('\n')
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`

const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`

export async function write3mf(parts: ThreeMfPart[], title: string): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', CONTENT_TYPES)
  zip.file('_rels/.rels', RELS)
  zip.file('3D/3dmodel.model', threeMfModel(parts, title))
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}
