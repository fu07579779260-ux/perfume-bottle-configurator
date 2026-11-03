import Module, { type ManifoldToplevel } from 'manifold-3d'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type DesignConfig, type ProfilePoint } from '@/model/config'
import { designReducer } from '@/model/reducer'
import { designChecks } from './checks'
import { addControlPoint, controlPointsFromSilhouette } from './control-points'
import { toManifold } from './manifold-mesh'
import { shellOpenings } from './openings'
import { controlRadius, evalControl } from './profile-curve'
import { buildShellMesh, checkWall, shellLayout, shellProfile } from './shell'

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

const vase: ProfilePoint[] = [[0, 0.3], [0.35, 0.9], [0.7, 0.2], [1, 0.5]]

describe('evalControl', () => {
  it('passes through every point and never overshoots between them', () => {
    for (const [t, w] of vase) expect(evalControl(vase, t)).toBeCloseTo(w)
    for (let t = 0; t <= 1; t += 0.01) {
      const w = evalControl(vase, t)
      expect(w).toBeGreaterThanOrEqual(0.2 - 1e-9)
      expect(w).toBeLessThanOrEqual(0.9 + 1e-9)
    }
  })
})

describe('drawn outline', () => {
  const c = design({ mode: { advanced: true }, shape: { profilePoints: vase } })

  it('follows the control points in the advanced mode only', () => {
    const l = shellLayout(c)
    const outer = shellProfile(c).filter((p) => p.side === 'outer' && p.r > 0)
    const at = (t: number) => {
      const y = l.bottomY + t * l.height
      return outer.reduce((best, p) => (Math.abs(p.y - y) < Math.abs(best.y - y) ? p : best)).r
    }
    expect(at(0.35)).toBeCloseTo(controlRadius(c.bottle, 0.9), 0)
    expect(at(0.35)).toBeGreaterThan(at(0.7) + 5)
    // Turned off, the same points do nothing
    const off = design({ mode: { advanced: false }, shape: { profilePoints: vase } })
    expect(shellLayout(off).control).toBeNull()
  })

  it('stays a closed solid that keeps the minimum wall', () => {
    const m = toManifold(wasm, buildShellMesh(c, 64))
    expect(m.status()).toBe('NoError')
    m.delete()
    const thin = design({ mode: { advanced: true }, shape: { profilePoints: [[0, 0], [0.5, 0], [1, 0], [0.3, 0]] } })
    expect(checkWall(thin).ok).toBe(true)
  })

  it('starts from points that follow the silhouette', () => {
    const pebble = design({ shape: { silhouette: 'pebble' } })
    const pts = controlPointsFromSilhouette(pebble)
    expect(pts).toHaveLength(6)
    expect(pts[0][0]).toBe(0)
    expect(pts[5][0]).toBe(1)
    // A pebble is wider in the middle than at the rim
    expect(Math.max(...pts.map(([, w]) => w))).toBeGreaterThan(pts[5][1])
  })

  it('adds a point in the widest gap, up to ten', () => {
    const more = addControlPoint(vase)
    expect(more).toHaveLength(5)
    expect(more[1][0]).toBeCloseTo(0.175)
    let many = vase
    for (let i = 0; i < 10; i++) many = addControlPoint(many)
    expect(many).toHaveLength(10)
  })
})

describe('free combinations and zones', () => {
  it('allows a texture on the coral in the advanced mode, with a note', () => {
    const c = design({ mode: { advanced: true }, shape: { silhouette: 'coral' }, texture: { type: 'fluted' } })
    expect(c.texture.type).toBe('fluted')
    expect(designChecks(c).map((x) => x.id)).toContain('freeCombo')
    expect(designChecks(design()).map((x) => x.id)).not.toContain('freeCombo')
  })

  it('keeps openwork inside its zone', () => {
    const lower = design({ mode: { advanced: true }, texture: { type: 'cellular', zone: 'lower', zoneSplit: 50 } })
    const split = shellLayout(lower).texture.split
    const cells = shellOpenings(lower).cells
    expect(cells.length).toBeGreaterThan(0)
    for (const hole of cells) for (const [, y] of hole) expect(y).toBeLessThanOrEqual(split)

    const upper = design({ mode: { advanced: true }, texture: { type: 'fluted', zone: 'bands', upperType: 'cellular' } })
    for (const hole of shellOpenings(upper).cells) for (const [, y] of hole) expect(y).toBeGreaterThanOrEqual(shellLayout(upper).texture.split)
  })
})
