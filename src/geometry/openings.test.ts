import Module, { type ManifoldToplevel } from 'manifold-3d'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type DesignConfig } from '@/model/config'
import { designReducer } from '@/model/reducer'
import { toManifold } from './manifold-mesh'
import { hasOpenings, shellOpenings } from './openings'
import { cutShell, printParts } from './parts'
import { buildShellMesh, shellLayout } from './shell'

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

function solid(mesh: { positions: Float32Array; indices: Uint32Array }) {
  const m = toManifold(wasm, mesh)
  const out = { status: m.status(), volume: m.volume(), genus: m.genus() }
  m.delete()
  return out
}

describe('cellular openwork', () => {
  const c = design({ texture: { type: 'cellular', cellSize: 12, cellRim: 2.5 } })

  it('makes a pattern of holes inside the textured band', () => {
    const o = shellOpenings(c)
    const span = shellLayout(c).texture
    expect(o.cells.length).toBeGreaterThan(10)
    for (const hole of o.cells) {
      for (const [, y] of hole) {
        expect(y).toBeGreaterThanOrEqual(span.from)
        expect(y).toBeLessThanOrEqual(span.to)
      }
    }
  })

  it('cuts real through-holes and stays a printable solid', () => {
    const cut = solid(cutShell(wasm, c, 64)!)
    const whole = solid(buildShellMesh(c, 64))
    expect(cut.status).toBe('NoError')
    expect(cut.volume).toBeLessThan(whole.volume * 0.95)
    // Every hole through the wall adds a handle to the solid
    expect(cut.genus).toBeGreaterThan(whole.genus + 5)
  })

  it('always gives the same pattern for the same seed, and a new one for a new seed', () => {
    const again = shellOpenings(design({ texture: { type: 'cellular' } }))
    expect(again.cells).toEqual(shellOpenings(design({ texture: { type: 'cellular' } })).cells)
    const other = shellOpenings(design({ texture: { type: 'cellular' }, shape: { growthSeed: 7 } }))
    expect(other.cells).not.toEqual(again.cells)
  })

  it('leaves out cells too small for the printer', () => {
    const tiny = shellOpenings(design({ texture: { type: 'cellular', cellSize: 6, cellRim: 6 } }))
    expect(tiny.skipped).toBeGreaterThan(0)
  })
})

describe('windows', () => {
  it.each(['slot', 'arch', 'ellipse'] as const)('%s windows cut through the wall', (windowShape) => {
    const c = design({ texture: { windowCount: 3, windowShape, windowWidth: 8, windowHeight: 30 } })
    expect(shellOpenings(c).windows).toHaveLength(3)
    const cut = solid(cutShell(wasm, c, 64)!)
    expect(cut.status).toBe('NoError')
    expect(cut.genus).toBe(solid(buildShellMesh(c, 64)).genus + 3)
  })

  it('fits windows to the shell when they are too tall', () => {
    const c = design({ texture: { windowCount: 1, windowHeight: 180 } })
    const [w] = shellOpenings(c).windows
    const span = shellLayout(c).texture
    const ys = w.map(([, y]) => y)
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(span.to - span.from)
  })

  it('works together with openwork, and in the exported halves', () => {
    const c = design({
      assembly: { method: 'halves' },
      shape: { baseExtra: 16, shoulderExtra: 16 },
      texture: { type: 'cellular', windowCount: 2 },
    })
    const parts = printParts(wasm, c, 48)
    for (const id of ['front', 'back', 'cap'] as const) {
      expect(solid(parts.find((p) => p.id === id)!.mesh).status).toBe('NoError')
    }
  })

  it('has no openings by default', () => {
    expect(hasOpenings(design())).toBe(false)
  })
})
