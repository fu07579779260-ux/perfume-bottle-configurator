import Module, { type ManifoldToplevel } from 'manifold-3d'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type DesignConfig } from '@/model/config'
import { designReducer } from '@/model/reducer'
import { toManifold } from './manifold-mesh'
import { markItems, type Marks } from './marks'
import { meshBounds, type MeshData } from './mesh'
import { printParts } from './parts'
import type { Outline } from './trace'

let wasm: ManifoldToplevel
beforeAll(async () => {
  wasm = await Module()
  wasm.setup()
})

function design(patch: { [S in keyof DesignConfig]?: Partial<DesignConfig[S]> } = {}): DesignConfig {
  let c = structuredClone(DEFAULT_CONFIG)
  for (const [section, values] of Object.entries(patch)) {
    c = designReducer(c, { type: 'patch', section, values } as never)
  }
  return c
}

/** A 12 × 8 mm "O": a rectangle with a hole, like a traced letter. */
const ring: Outline = [
  [[-6, -4], [6, -4], [6, 4], [-6, 4]],
  [[-3, -2], [-3, 2], [3, 2], [3, -2]],
]
const marks: Marks = { text: ring, logo: ring, number: ring }

function solid(mesh: MeshData) {
  const m = toManifold(wasm, mesh)
  const out = { status: m.status(), volume: m.volume() }
  m.delete()
  return out
}
const part = (c: DesignConfig, id: string, m: Marks = marks) => printParts(wasm, c, 64, m).find((p) => p.id === id)!.mesh

describe('markItems', () => {
  it('uses only the marks the design asks for', () => {
    expect(markItems(design(), marks).map((i) => i.face)).toEqual(['base'])
    const c = design({ personal: { text: 'Lin', textPosition: 'front', logoName: 'logo.svg', logoPosition: 'capTop' } })
    expect(markItems(c, marks).map((i) => i.face)).toEqual(['front', 'capTop', 'base'])
    expect(markItems(design({ personal: { designNumber: false } }), marks)).toEqual([])
  })

  it('always engraves the base, so the bottle stands flat', () => {
    const c = design({ personal: { text: 'Lin', textPosition: 'base', textMode: 'raised' } })
    expect(markItems(c, marks).every((i) => i.mode === 'engraved')).toBe(true)
  })
})

describe('applying marks', () => {
  const none: Marks = { text: null, logo: null, number: null }

  it('raised text on the front adds material and stays one solid', () => {
    const c = design({ personal: { text: 'Lin', textPosition: 'front', textMode: 'raised', designNumber: false } })
    const plain = solid(part(c, 'shell', none))
    const marked = solid(part(c, 'shell'))
    expect(marked.status).toBe('NoError')
    expect(marked.volume).toBeGreaterThan(plain.volume)
    // The letters stand out at the front (+Z)
    expect(meshBounds(part(c, 'shell')).max[2]).toBeGreaterThan(meshBounds(part(c, 'shell', none)).max[2] + 0.5)
  })

  it('engraved text on the back cuts into the wall', () => {
    const c = design({ personal: { text: 'Lin', textPosition: 'back', textMode: 'engraved', designNumber: false } })
    const marked = solid(part(c, 'shell'))
    expect(marked.status).toBe('NoError')
    expect(marked.volume).toBeLessThan(solid(part(c, 'shell', none)).volume)
  })

  it('engraves the design number into the floor, or into the base cap of a bottom-loaded shell', () => {
    const top = design()
    expect(solid(part(top, 'shell')).volume).toBeLessThan(solid(part(top, 'shell', none)).volume)
    const bottom = design({ assembly: { method: 'bottom' } })
    expect(solid(part(bottom, 'base')).volume).toBeLessThan(solid(part(bottom, 'base', none)).volume)
    expect(solid(part(bottom, 'shell')).volume).toBeCloseTo(solid(part(bottom, 'shell', none)).volume, 0)
  })

  it('puts a logo on top of the cap, also on a domed cap', () => {
    for (const form of ['cylinder', 'sphere'] as const) {
      const c = design({ cap: { form }, personal: { logoName: 'logo.svg', logoPosition: 'capTop', textMode: 'raised', designNumber: false } })
      const marked = solid(part(c, 'cap'))
      expect(marked.status).toBe('NoError')
      expect(marked.volume).toBeGreaterThan(solid(part(c, 'cap', none)).volume)
    }
  })

  it('keeps marks on a two-part shell', () => {
    const c = design({ assembly: { method: 'halves' }, shape: { baseExtra: 16, shoulderExtra: 16 }, personal: { text: 'Lin', textPosition: 'front' } })
    const parts = printParts(wasm, c, 48, marks)
    for (const id of ['front', 'back'] as const) expect(solid(parts.find((p) => p.id === id)!.mesh).status).toBe('NoError')
  })
})
