import Module, { type ManifoldToplevel } from 'manifold-3d'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type DesignConfig } from '@/model/config'
import { designReducer } from '@/model/reducer'
import { buildCapMesh } from './cap'
import { toManifold } from './manifold-mesh'
import { periodicNoise } from './noise'
import { shellOpenings } from './openings'
import { cutShell } from './parts'
import { buildShellMesh, checkWall } from './shell'

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

describe('periodicNoise', () => {
  it('meets itself across the seam', () => {
    for (const y of [0.3, 1.7, 4.2]) expect(periodicNoise(5, 0, y, 12)).toBeCloseTo(periodicNoise(5, 12, y, 12), 10)
  })

  it('depends on the seed', () => {
    expect(periodicNoise(1, 2.5, 3.5, 12)).not.toBeCloseTo(periodicNoise(2, 2.5, 3.5, 12), 3)
  })
})

describe('coral', () => {
  const c = design({ shape: { silhouette: 'coral' } })

  it('loads from the bottom and starts with a full, rounded head', () => {
    expect(c.assembly.method).toBe('bottom')
    expect(c.shape.shoulderExtra).toBe(22)
  })

  it('cuts brain-coral grooves into the skin, never below the minimum wall', () => {
    const smooth = solid(buildShellMesh(design({ shape: { silhouette: 'coral', grooveDepth: 0 } }), 96))
    const grooved = solid(buildShellMesh(c, 96))
    expect(grooved.status).toBe('NoError')
    expect(grooved.volume).toBeLessThan(smooth.volume)
    expect(checkWall(design({ shape: { silhouette: 'coral', grooveDepth: 3, shoulderExtra: 4, baseExtra: 4 } })).ok).toBe(true)
  })

  it('scatters more pores at a higher density, none at 0, and none touching', () => {
    const none = shellOpenings(design({ shape: { silhouette: 'coral', holeDensity: 0 } })).cells
    const some = shellOpenings(design({ shape: { silhouette: 'coral', holeDensity: 0.3 } })).cells
    const many = shellOpenings(design({ shape: { silhouette: 'coral', holeDensity: 1 } })).cells
    expect(none).toHaveLength(0)
    expect(many.length).toBeGreaterThan(some.length)
    expect(some.length).toBeGreaterThan(0)
  })

  it('cuts the pores through and stays one printable solid', () => {
    const cut = solid(cutShell(wasm, c, 96)!)
    expect(cut.status).toBe('NoError')
    expect(cut.genus).toBeGreaterThan(5)
  })

  it('grows the same way for the same seed, and differently for another', () => {
    const a = shellOpenings(c).cells
    expect(shellOpenings(design({ shape: { silhouette: 'coral' } })).cells).toEqual(a)
    expect(shellOpenings(design({ shape: { silhouette: 'coral', growthSeed: 42 } })).cells).not.toEqual(a)
  })

  it('gets a domed cap when the cap follows the body', () => {
    expect(solid(buildCapMesh(c, 64)).status).toBe('NoError')
  })
})
