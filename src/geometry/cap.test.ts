import Module, { type ManifoldToplevel } from 'manifold-3d'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type DesignConfig } from '@/model/config'
import { CAP_FORMS, SCULPTURAL_STYLES } from '@/model/options'
import { designReducer } from '@/model/reducer'
import { pumpLayout } from './bottle'
import { envelopeRadius } from './envelope'
import { buildCapMesh, capLayout, capProfile } from './cap'
import { toManifold } from './manifold-mesh'
import { capMagnetPlan, printParts } from './parts'
import { shellLayout } from './shell'

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

function solidVolume(c: DesignConfig) {
  const m = toManifold(wasm, buildCapMesh(c, 64))
  const v = m.volume()
  expect(m.status()).toBe('NoError')
  m.delete()
  return v
}

describe('cap forms', () => {
  const silhouettes = ['column', 'teardrop', 'prism', 'pebble'] as const

  it.each(CAP_FORMS.flatMap((form) => silhouettes.map((silhouette) => [form, silhouette] as const)))(
    '%s cap on a %s shell is a closed solid',
    (form, silhouette) => {
      expect(solidVolume(design({ shape: { silhouette, prismTwist: 20 }, cap: { form } }))).toBeGreaterThan(0)
    },
  )

  it.each(SCULPTURAL_STYLES)('sculptural %s is a closed solid', (sculpturalStyle) => {
    expect(solidVolume(design({ cap: { form: 'sculptural', sculpturalStyle } }))).toBeGreaterThan(0)
  })
})

describe('capLayout', () => {
  it('sits on the shell top and slides over the spigot with the cap clearance', () => {
    const c = design({ cap: { clearance: 0.3 } })
    const cap = capLayout(c)
    const l = shellLayout(c)
    expect(cap.baseY).toBe(l.topY)
    expect(cap.socketRadius).toBeCloseTo(l.spigot.outer + 0.3)
    expect(cap.socketTop).toBeGreaterThan(l.spigot.topY)
  })

  it('clears the pump inside', () => {
    for (const method of ['top', 'bottom', 'halves'] as const) {
      const c = design({ assembly: { method } })
      const pump = pumpLayout(c.bottle)
      const cap = capLayout(c)
      const inner = capProfile(c).filter((p) => p.side !== 'outer')
      // The cavity tip is above the push button, and the cap is taller still
      expect(cap.apex).toBeGreaterThan(pump.top)
      expect(cap.topY).toBeGreaterThan(cap.apex)
      // Wherever the pump is wider than the inside at that height, it would hit
      for (let y = cap.socketTop; y < pump.top; y += 0.5) {
        const room = Math.max(...inner.filter((p) => Math.abs(p.y - y) < 0.6).map((p) => p.r), 0)
        if (room > 0) expect(room).toBeGreaterThan(envelopeRadius(c.bottle, y))
      }
    }
  })

  it('grows taller than asked when the pump needs it, and says so', () => {
    const low = capLayout(design({ cap: { height: 15 } }))
    expect(low.raised).toBe(true)
    expect(capLayout(design({ cap: { height: 60 } })).raised).toBe(false)
  })

  it('follows the shell width, or takes a share of the shoulder', () => {
    const c = design({ cap: { form: 'cylinder', width: 50 } })
    expect(capLayout(c).radius).toBeCloseTo(shellLayout(c).shoulderRadius * 0.5)
  })
})

describe('cap fits', () => {
  it('cuts magnet pockets into both the shell seat and the cap', () => {
    const c = design({ cap: { fit: 'magnet' }, shape: { shoulderExtra: 24, baseExtra: 24 } })
    const plan = capMagnetPlan(c)!
    expect(plan.fits).toBe(true)
    const plain = printParts(wasm, design({ shape: { shoulderExtra: 24, baseExtra: 24 } }), 48)
    const pocketed = printParts(wasm, c, 48)
    const vol = (parts: typeof plain, id: string) => {
      const m = toManifold(wasm, parts.find((p) => p.id === id)!.mesh)
      const v = m.volume()
      m.delete()
      return v
    }
    expect(vol(pocketed, 'shell')).toBeLessThan(vol(plain, 'shell'))
    expect(vol(pocketed, 'cap')).toBeLessThan(vol(plain, 'cap'))
  })

  it('says when the seat is too narrow for magnets', () => {
    expect(capMagnetPlan(design({ cap: { fit: 'magnet' }, shape: { shoulderExtra: 4, baseExtra: 4 } }))!.fits).toBe(false)
  })

  it('snaps with a bead on the spigot that is bigger than the socket mouth', () => {
    const c = design({ cap: { fit: 'snap' } })
    const l = shellLayout(c)
    const cap = capLayout(c)
    // The bead reaches past the socket, so the cap clicks over it
    expect(l.spigot.outer + l.spigot.depth).toBeGreaterThan(cap.socketRadius)
    expect(solidVolume(c)).toBeGreaterThan(0)
  })
})
