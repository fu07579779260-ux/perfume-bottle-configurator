import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type DesignConfig } from '@/model/config'
import { designReducer } from '@/model/reducer'
import { buildShellMesh, checkWall, shellLayout, shellProfile, shellSize, type MeshData } from './shell'

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

describe('shellSize', () => {
  it('reports width, depth and height', () => {
    const c = design({ shape: { shoulderExtra: 20, baseExtra: 12, sectionRatio: 0.8 } })
    const s = shellSize(c)
    expect(s.width).toBe(c.bottle.bodyDiameter + 20)
    expect(s.depth).toBeCloseTo(s.width * 0.8)
    expect(s.height).toBe(c.bottle.bodyHeight + c.shape.heightExtra)
  })
})

describe('checkWall', () => {
  it('passes the default design', () => {
    expect(checkWall(design()).ok).toBe(true)
  })

  it('fails when the shell is barely wider than the bottle', () => {
    const w = checkWall(design({ shape: { baseExtra: 4, shoulderExtra: 4 }, assembly: { clearance: 0.6 } }))
    expect(w.minWall).toBeCloseTo(1.4)
    expect(w.ok).toBe(false)
  })

  it('accepts the same wall on resin, which allows thinner walls', () => {
    const c = design({ manufacturing: { technology: 'resin' }, shape: { baseExtra: 4, shoulderExtra: 4 } })
    expect(checkWall(c).ok).toBe(true)
  })

  it('measures the thin side of a squashed section', () => {
    const w = checkWall(design({ shape: { sectionRatio: 0.5 } }))
    expect(w.ok).toBe(false)
    expect(w.minWall).toBeLessThan(1)
  })
})
