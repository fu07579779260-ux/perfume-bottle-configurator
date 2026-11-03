import Module, { type ManifoldToplevel } from 'manifold-3d'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type DesignConfig } from '@/model/config'
import { designReducer } from '@/model/reducer'
import { toManifold } from './manifold-mesh'
import { buildShellMesh, checkWall, shellLayout } from './shell'
import { textureOffset, textureSegments } from './texture'

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

function volume(c: DesignConfig) {
  const m = toManifold(wasm, buildShellMesh(c, 96))
  expect(m.status()).toBe('NoError')
  const v = m.volume()
  m.delete()
  return v
}

describe('textures', () => {
  it.each(['fluted', 'facets', 'waves'] as const)('%s keeps the shell a closed solid and changes its volume', (type) => {
    const smooth = volume(design())
    expect(volume(design({ texture: { type } }))).not.toBeCloseTo(smooth, 0)
  })

  it('cuts flutes into the wall', () => {
    expect(volume(design({ texture: { type: 'fluted', fluteDepth: 2 } }))).toBeLessThan(volume(design()))
  })

  it('makes spiral waves a closed solid too', () => {
    expect(volume(design({ texture: { type: 'waves', waveDirection: 'spiral' } }))).toBeGreaterThan(0)
  })

  it('never cuts below the minimum wall', () => {
    const c = design({ shape: { baseExtra: 4, shoulderExtra: 4 }, texture: { type: 'fluted', fluteDepth: 3 } })
    const l = shellLayout(c)
    const p = buildShellMesh(c, 96).positions
    for (let i = 0; i < p.length; i += 3) {
      const y = p[i + 1]
      if (y < 1 || y > l.topY - 6) continue
      const r = Math.hypot(p[i], p[i + 2])
      // Skip the inside of the bore
      if (r > l.cavityRadius + 0.01) expect(r).toBeGreaterThanOrEqual(l.cavityRadius + l.minWall - 1e-3)
    }
    expect(checkWall(c).ok).toBe(true)
  })

  it('fades out at the base and below the cap seat', () => {
    const c = design({ texture: { type: 'waves' } })
    const span = shellLayout(c).texture
    expect(textureOffset(c, span, span.from, 0, 20)).toBe(0)
    expect(textureOffset(c, span, span.to, 0, 20)).toBe(0)
  })

  it('only textures the lower part when the zone says so', () => {
    const c = design({ mode: { advanced: true }, texture: { type: 'waves', zone: 'lower', zoneSplit: 50 } })
    const span = shellLayout(c).texture
    const above = Array.from({ length: 20 }, (_, i) => textureOffset(c, span, span.split + 3 + i * 0.7, 0, 20))
    expect(Math.max(...above.map(Math.abs))).toBe(0)
  })

  it('uses more segments for many flutes, up to a limit', () => {
    expect(textureSegments(design({ texture: { type: 'fluted', fluteCount: 40 } }), 96)).toBe(200)
    expect(textureSegments(design({ texture: { type: 'fluted', fluteCount: 48 } }), 192)).toBe(480)
    expect(textureSegments(design(), 96)).toBe(96)
  })

  it('works on a faceted prism and a bottom-loaded pebble', () => {
    expect(volume(design({ shape: { silhouette: 'prism' }, texture: { type: 'fluted' } }))).toBeGreaterThan(0)
    expect(volume(design({ shape: { silhouette: 'pebble' }, texture: { type: 'facets' } }))).toBeGreaterThan(0)
  })
})
