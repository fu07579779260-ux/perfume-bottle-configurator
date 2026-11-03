import Module, { type ManifoldToplevel } from 'manifold-3d'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type DesignConfig } from '@/model/config'
import { designReducer } from '@/model/reducer'
import { pumpLayout } from './bottle'
import { toManifold } from './manifold-mesh'
import { meshBounds, type MeshData } from './mesh'
import { jointInfo, layoutForPrint, previewParts, printParts } from './parts'
import { buildBaseCapMesh, buildShellMesh, checkWall, shellLayout, shellProfile } from './shell'

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

/** Volume via the geometry kernel, which also rejects meshes that aren't closed solids. */
function solidVolume(mesh: MeshData) {
  const m = toManifold(wasm, mesh)
  const v = m.volume()
  const status = m.status()
  m.delete()
  expect(status).toBe('NoError')
  return v
}

describe('bottom-loaded shell', () => {
  const c = design({ shape: { silhouette: 'teardrop' } })

  it('is the recommended method for the teardrop', () => {
    expect(c.assembly.method).toBe('bottom')
  })

  it('is a closed solid, and so is its base cap', () => {
    expect(solidVolume(buildShellMesh(c, 64))).toBeGreaterThan(0)
    expect(solidVolume(buildBaseCapMesh(c, 64)!)).toBeGreaterThan(0)
  })

  it('narrows above the shoulder to less than the glass, leaving room for the pump', () => {
    const l = shellLayout(c)
    const nearTop = shellProfile(c).filter((p) => p.side === 'outer' && p.y > l.topY - 3)
    expect(Math.max(...nearTop.map((p) => p.r))).toBeLessThan(c.bottle.bodyDiameter / 2)
    expect(l.holeRadius).toBeGreaterThan(pumpLayout(c.bottle).collar.radius)
  })

  it('lets the glass pass through the bottom opening', () => {
    const l = shellLayout(c)
    for (const p of shellProfile(c)) {
      if (p.side === 'thread') expect(p.r).toBeGreaterThanOrEqual(c.bottle.bodyDiameter / 2 + c.assembly.clearance)
    }
    expect(l.baseFit?.topY).toBe(0)
  })

  it('stops the shell top below the push button', () => {
    const high = design({ shape: { silhouette: 'teardrop', heightExtra: 40 } })
    expect(shellLayout(high).topY).toBeLessThanOrEqual(pumpLayout(high.bottle).top - 4)
  })

  it('works with a snap-in base cap too', () => {
    const snap = design({ shape: { silhouette: 'teardrop' }, assembly: { baseFixing: 'snap' } })
    expect(solidVolume(buildShellMesh(snap, 64))).toBeGreaterThan(0)
    expect(solidVolume(buildBaseCapMesh(snap, 64)!)).toBeGreaterThan(0)
  })

  it('keeps the minimum wall around the thread', () => {
    expect(checkWall(design({ shape: { silhouette: 'teardrop', baseExtra: 4 } })).ok).toBe(true)
  })

  it('cuts a coin slot into a screw-in base cap', () => {
    const parts = printParts(wasm, c, 64)
    expect(parts.map((p) => p.id)).toEqual(['shell', 'base'])
    const slotted = solidVolume(parts[1].mesh)
    expect(slotted).toBeLessThan(solidVolume(buildBaseCapMesh(c, 64)!))
  })
})

describe('two halves', () => {
  const c = design({ shape: { silhouette: 'exoskeleton' } }) // recommends halves; the shape itself is still a column here
  const asColumn = design({ assembly: { method: 'halves' }, shape: { baseExtra: 16, shoulderExtra: 16 } })

  it('is the recommended method for the exoskeleton', () => {
    expect(c.assembly.method).toBe('halves')
  })

  it('splits into a front and a back half with dowels', () => {
    const parts = printParts(wasm, asColumn, 64)
    const ids = parts.map((p) => p.id)
    expect(ids.slice(0, 2)).toEqual(['front', 'back'])
    expect(ids.filter((id) => id === 'dowel')).toHaveLength(jointInfo(asColumn).count)
    expect(jointInfo(asColumn)).toMatchObject({ kind: 'dowels', diameter: 3, fits: true })
    const whole = solidVolume(buildShellMesh(asColumn, 64))
    const halves = solidVolume(parts[0].mesh) + solidVolume(parts[1].mesh)
    // The halves add up to the whole, minus the dowel holes
    expect(halves).toBeLessThan(whole)
    expect(halves).toBeGreaterThan(whole * 0.97)
  })

  it('uses magnet pockets and no dowels when magnets are chosen', () => {
    const m = design({ assembly: { method: 'halves', halfJoint: 'magnets' }, shape: { baseExtra: 16, shoulderExtra: 16 } })
    const parts = printParts(wasm, m, 48)
    expect(parts.some((p) => p.id === 'dowel')).toBe(false)
    expect(jointInfo(m)).toMatchObject({ kind: 'magnets', diameter: 5, length: 2, fits: true })
    expect(jointInfo(m).count).toBe(8)
  })

  it('says to glue the halves when the wall is too thin for any pin', () => {
    const thin = design({ assembly: { method: 'halves' }, shape: { baseExtra: 4, shoulderExtra: 4 } })
    expect(jointInfo(thin).fits).toBe(false)
  })

  it('follows the bottle: a closed floor and a cavity that narrows to the pump', () => {
    const l = shellLayout(asColumn)
    expect(l.bottomY).toBeLessThan(0)
    expect(l.holeRadius).toBeLessThan(l.cavityRadius)
  })
})

describe('top-loaded friction ribs', () => {
  it('reach in to just touch the glass', () => {
    const c = design({ assembly: { frictionRibs: 4 } })
    const mesh = buildShellMesh(c, 192)
    const glass = c.bottle.bodyDiameter / 2
    let closest = Infinity
    const p = mesh.positions
    for (let i = 0; i < p.length; i += 3) {
      const d = Math.hypot(p[i], p[i + 2])
      if (p[i + 1] > -0.01 && p[i + 1] < 60 && d > 5) closest = Math.min(closest, d)
    }
    expect(closest).toBeCloseTo(glass - 0.05, 1)
  })
})

describe('layoutForPrint', () => {
  it('puts every part on the bed, side by side', () => {
    const c = design({ assembly: { method: 'halves' }, shape: { baseExtra: 16, shoulderExtra: 16 } })
    const laid = layoutForPrint(printParts(wasm, c, 48))
    const b = meshBounds(laid)
    expect(b.min[1]).toBeCloseTo(0, 5)
    // Two halves lying down are much lower than the shell standing up
    expect(b.height).toBeLessThan(shellLayout(c).height / 2)
    expect(solidVolume(laid)).toBeGreaterThan(0)
  })

  it('previews a bottom-loaded shell with its base cap', () => {
    expect(previewParts(design({ shape: { silhouette: 'pebble' } })).map((p) => p.id)).toEqual(['shell', 'base'])
  })
})
