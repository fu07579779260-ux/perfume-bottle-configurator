import JSZip from 'jszip'
import Module, { type ManifoldToplevel } from 'manifold-3d'
import rhino3dm, { type RhinoModule } from 'rhino3dm'
import { beforeAll, describe, expect, it } from 'vitest'
import { layoutParts, partForPrint, printParts } from '@/geometry/parts'
import { DEFAULT_CONFIG, type DesignConfig } from '@/model/config'
import { designReducer } from '@/model/reducer'
import { glassReference, RHINO_FILE_VERSION, write3dm } from './rhino'
import { designSummary } from './summary'
import { threeMfModel, write3mf } from './threemf'

let wasm: ManifoldToplevel
let rhino: RhinoModule
beforeAll(async () => {
  wasm = await Module()
  wasm.setup()
  rhino = await rhino3dm()
})

function design(patch: { [S in keyof DesignConfig]?: Partial<DesignConfig[S]> } = {}): DesignConfig {
  let c = structuredClone(DEFAULT_CONFIG)
  for (const [section, values] of Object.entries(patch)) {
    c = designReducer(c, { type: 'patch', section, values } as never)
  }
  return c
}

describe('3MF', () => {
  it('writes every part as a named, coloured object, Z up, in mm', async () => {
    const laid = layoutParts(printParts(wasm, DEFAULT_CONFIG, 32))
    const xml = threeMfModel(
      laid.map((p, i) => ({ name: `Part ${i}`, colour: i ? '#112233' : '#E6D8BF', mesh: p.mesh })),
      'Test',
    )
    expect(xml).toContain('unit="millimeter"')
    expect(xml.match(/<object /g)).toHaveLength(laid.length)
    expect(xml).toContain('displaycolor="#E6D8BFFF"')
    expect(xml).toContain('name="Part 1"')
    // Every part stands on the bed: no vertex below z = 0
    const zs = [...xml.matchAll(/ z="(-?[\d.]+)"/g)].map((m) => Number(m[1]))
    expect(Math.min(...zs)).toBeGreaterThanOrEqual(-1e-3)
  })

  it('packs the model in a 3MF archive', async () => {
    const laid = layoutParts(printParts(wasm, DEFAULT_CONFIG, 24))
    const bytes = await write3mf(laid.map((p) => ({ name: p.id, colour: '#e6d8bf', mesh: p.mesh })), 'Test')
    const zip = await JSZip.loadAsync(bytes)
    for (const f of ['3D/3dmodel.model', '[Content_Types].xml', '_rels/.rels']) expect(zip.file(f)).not.toBeNull()
    expect(await zip.file('3D/3dmodel.model')!.async('string')).toContain('<build>')
  })
})

describe('per-part STL', () => {
  it('stands every part on the bed at the origin', () => {
    for (const part of printParts(wasm, design({ assembly: { method: 'bottom' } }), 24)) {
      const p = partForPrint(part).positions
      let minY = Infinity
      for (let i = 1; i < p.length; i += 3) minY = Math.min(minY, p[i])
      expect(minY).toBeCloseTo(0, 5)
    }
  })
})

describe('3DM', () => {
  it('opens in Rhino with one named layer per part and the glass bottle', () => {
    const c = design({ assembly: { method: 'bottom' } })
    const parts = printParts(wasm, c, 24).map((p) => ({ name: p.id, colour: '#e6d8bf', mesh: p.mesh }))
    parts.push({ name: 'Glass', colour: '#cfe3df', mesh: glassReference(c.bottle) })
    const doc = rhino.File3dm.fromByteArray(write3dm(rhino, parts, 'Test'))
    expect(doc.objects().count).toBe(parts.length)
    expect(doc.layers().count).toBe(parts.length)
    expect(doc.layers().get(0).name).toBe('shell')
    expect(RHINO_FILE_VERSION).toBe(7)
    doc.delete()
  })
})

describe('designSummary', () => {
  it('describes the design in both languages', () => {
    const c = design({ shape: { silhouette: 'coral' }, personal: { text: 'Lin' } })
    const en = designSummary(c, 'en')
    const zh = designSummary(c, 'zh')
    expect(en.title).toBe('Coral')
    expect(zh.title).toBe('珊瑚')
    expect(en.rows.length).toBe(zh.rows.length)
    expect(en.rows.some(([, v]) => v.includes('Lin'))).toBe(true)
    expect(en.code).toMatch(/^PB-/)
    expect(en.printTips).toHaveLength(3)
    expect(en.finishing).toHaveLength(2)
  })
})
