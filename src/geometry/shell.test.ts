import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type DesignConfig } from '@/model/config'
import { designReducer } from '@/model/reducer'
import type { MeshData } from './mesh'
import { buildShellMesh, checkOverhang, checkWall, shellLayout, shellProfile, shellSize, SPIGOT_HEIGHT } from './shell'

function design(patch: { [S in keyof DesignConfig]?: Partial<DesignConfig[S]> } = {}): DesignConfig {
  let c = structuredClone(DEFAULT_CONFIG)
  for (const [section, values] of Object.entries(patch)) {
    c = designReducer(c, { type: 'patch', section, values } as never)
  }
  return c
}

/** Signed volume (positive when the triangles face outwards). */
function volume({ positions: p, indices: ix }: MeshData) {
  let v = 0
  for (let i = 0; i < ix.length; i += 3) {
    const [a, b, c] = [ix[i] * 3, ix[i + 1] * 3, ix[i + 2] * 3]
    v +=
      p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) -
      p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) +
      p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])
  }
  return v / 6
}

/** Volume of the profile turned around the axis (exact for a round section). */
function profileVolume(config: DesignConfig) {
  const p = shellProfile(config)
  let v = 0
  for (let i = 0; i < p.length; i++) {
    const a = p[i]
    const b = p[(i + 1) % p.length]
    v += (a.r * a.r + a.r * b.r + b.r * b.r) * (b.y - a.y)
  }
  return Math.abs((Math.PI / 3) * v)
}

describe('buildShellMesh', () => {
  it('is watertight: every edge is used once in each direction', () => {
    const { indices } = buildShellMesh(design(), 32)
    const edges = new Map<string, number>()
    for (let i = 0; i < indices.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const key = `${indices[i + k]}>${indices[i + ((k + 1) % 3)]}`
        edges.set(key, (edges.get(key) ?? 0) + 1)
      }
    }
    for (const [key, count] of edges) {
      const [a, b] = key.split('>')
      expect(count).toBe(1)
      expect(edges.get(`${b}>${a}`)).toBe(1)
    }
  })

  it('faces outwards and matches the volume of the profile', () => {
    const c = design()
    const v = volume(buildShellMesh(c, 192))
    expect(v).toBeGreaterThan(0)
    expect(v / profileVolume(c)).toBeCloseTo(1, 2)
  })

  it('gets smaller in depth when the section is squashed', () => {
    const round = volume(buildShellMesh(design(), 64))
    const flat = volume(buildShellMesh(design({ shape: { sectionRatio: 0.8 } }), 64))
    expect(flat).toBeLessThan(round)
  })
})

describe('shellProfile', () => {
  it('leaves the clearance around the glass all the way up', () => {
    const c = design({ assembly: { clearance: 0.4 } })
    const glassR = c.bottle.bodyDiameter / 2
    for (const p of shellProfile(c)) {
      if (p.side === 'inner' && p.y >= 0 && p.r > 0) expect(p.r).toBeGreaterThanOrEqual(glassR + 0.4 - 1e-9)
    }
  })

  it('puts the floor under the bottle and the rim above the shoulder', () => {
    const c = design()
    const l = shellLayout(c)
    expect(l.bottomY).toBe(-l.floor)
    expect(l.topY - l.bottomY).toBe(c.bottle.bodyHeight + c.shape.heightExtra)
  })
})

/** Body width and depth at half height (below the cap seat). */
function midSection(c: DesignConfig) {
  const l = shellLayout(c)
  const mid = (l.bottomY + l.topY) / 2
  const p = buildShellMesh(c, 192).positions
  let w = 0
  let d = 0
  for (let i = 0; i < p.length; i += 3) {
    if (Math.abs(p[i + 1] - mid) > 2) continue
    w = Math.max(w, Math.abs(p[i]))
    d = Math.max(d, Math.abs(p[i + 2]))
  }
  return { width: 2 * w, depth: 2 * d }
}

describe('shellSize', () => {
  it('reports width, depth and height', () => {
    const c = design({ shape: { shoulderExtra: 20, baseExtra: 12, sectionRatio: 0.8 } })
    const s = shellSize(c)
    expect(s.width).toBeCloseTo(c.bottle.bodyDiameter + 20, 1)
    expect(s.depth).toBeCloseTo(s.width * 0.8, 1)
    // Body plus the spigot the cap slides onto
    expect(s.height).toBeCloseTo(c.bottle.bodyHeight + c.shape.heightExtra + SPIGOT_HEIGHT, 3)
  })
})

describe('checkWall', () => {
  it('passes the default design', () => {
    expect(checkWall(design()).ok).toBe(true)
  })

  it('thickens a shell that is barely wider than the bottle up to the minimum wall', () => {
    const c = design({ shape: { baseExtra: 4, shoulderExtra: 4 }, assembly: { clearance: 0.6 } })
    const w = checkWall(c)
    expect(w.minWall).toBeCloseTo(1.6)
    expect(w.ok).toBe(true)
    // 30 mm glass + 2 × (0.6 clearance + 1.6 wall)
    expect(midSection(c).width).toBeCloseTo(34.4, 1)
  })

  it('allows a thinner wall on resin', () => {
    const c = design({ manufacturing: { technology: 'resin' }, shape: { baseExtra: 4, shoulderExtra: 4 } })
    const w = checkWall(c)
    expect(w.ok).toBe(true)
    expect(w.minWall).toBeCloseTo(1.75)
  })

  it('never squashes the depth below the minimum wall', () => {
    const c = design({ shape: { sectionRatio: 0.5 } })
    expect(checkWall(c).minWall).toBeCloseTo(1.6)
    expect(midSection(c).depth).toBeCloseTo(c.bottle.bodyDiameter + 2 * (0.35 + 1.6), 1)
  })
})

describe('silhouettes', () => {
  const kinds = ['column', 'teardrop', 'prism', 'pebble'] as const

  it.each(kinds)('%s: watertight, outward, and keeps the cavity clear', (silhouette) => {
    const c = design({ shape: { silhouette, prismTwist: 30 } })
    const mesh = buildShellMesh(c, 48)
    expect(volume(mesh)).toBeGreaterThan(0)
    expect(checkWall(c).minWall).toBeGreaterThanOrEqual(1.6 - 1e-6)
    const edges = new Map<string, number>()
    for (let i = 0; i < mesh.indices.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const key = `${mesh.indices[i + k]}>${mesh.indices[i + ((k + 1) % 3)]}`
        edges.set(key, (edges.get(key) ?? 0) + 1)
      }
    }
    for (const [key, n] of edges) {
      const [a, b] = key.split('>')
      expect(n).toBe(1)
      expect(edges.get(`${b}>${a}`)).toBe(1)
    }
  })

  it('teardrop narrows towards the rim', () => {
    const c = design({ shape: { silhouette: 'teardrop' } })
    const l = shellLayout(c)
    const outer = shellProfile(c).filter((p) => p.side === 'outer' && p.r > 0)
    const widest = Math.max(...outer.map((p) => p.r))
    const nearTop = outer.filter((p) => p.y > l.topY - 6)
    expect(Math.max(...nearTop.map((p) => p.r))).toBeLessThan(widest - 4)
  })

  it('prism puts its flats at the shoulder radius and corners further out', () => {
    const c = design({ shape: { silhouette: 'prism', prismSides: 6, prismTwist: 0, shoulderExtra: 12, baseExtra: 12 } })
    const s = shellSize(c)
    const apothem = (c.bottle.bodyDiameter + 12) / 2
    // A hexagon's corners are 1/cos(30°) further out than its flats
    expect(Math.max(s.width, s.depth)).toBeCloseTo((2 * apothem) / Math.cos(Math.PI / 6), 0)
    expect(Math.min(s.width, s.depth)).toBeCloseTo(2 * apothem, 0)
  })

  it('pebble starts flattened', () => {
    const c = design({ shape: { silhouette: 'pebble' } })
    expect(c.shape.sectionRatio).toBe(0.65)
    const s = shellSize(c)
    expect(s.depth).toBeLessThan(s.width * 0.8)
  })
})

describe('checkOverhang', () => {
  it('passes a column', () => {
    expect(checkOverhang(design()).ok).toBe(true)
  })

  it('flags a big rounded base edge that leans out too far for FDM', () => {
    const c = design({ shape: { baseExtra: 40, shoulderExtra: 40, cornerRadius: 15 } })
    const o = checkOverhang(c)
    expect(o.maxAngle).toBeGreaterThan(45)
    expect(o.ok).toBe(false)
  })

  it('has no limit for resin or SLS', () => {
    const c = design({ manufacturing: { technology: 'sls' }, shape: { baseExtra: 40, shoulderExtra: 40, cornerRadius: 15 } })
    expect(checkOverhang(c)).toMatchObject({ limit: null, ok: true })
  })
})
