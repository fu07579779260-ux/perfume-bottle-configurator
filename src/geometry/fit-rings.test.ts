import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '@/model/config'
import { designReducer } from '@/model/reducer'
import { clearanceLadder, fitTestRings } from './fit-rings'
import { meshBounds, type MeshData } from './mesh'

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

describe('clearanceLadder', () => {
  it('centres five 0.05 mm steps on the current clearance', () => {
    expect(clearanceLadder(0.35)).toEqual([0.25, 0.3, 0.35, 0.4, 0.45])
  })

  it('shifts the ladder to stay inside 0.2–0.6 mm', () => {
    expect(clearanceLadder(0.2)).toEqual([0.2, 0.25, 0.3, 0.35, 0.4])
    expect(clearanceLadder(0.6)).toEqual([0.4, 0.45, 0.5, 0.55, 0.6])
  })
})

describe('fitTestRings', () => {
  const test = fitTestRings(DEFAULT_CONFIG, 48)

  it('sizes the body rings from the glass and the collar rings from the pump', () => {
    const d = DEFAULT_CONFIG.bottle
    expect(test.body.map((r) => r.innerDiameter)).toEqual([30.5, 30.6, 30.7, 30.8, 30.9])
    expect(test.collar[0].innerDiameter).toBeCloseTo(d.collarDiameter + 2 * test.collar[0].clearance)
  })

  it('makes every ring 1 mm taller than the one before', () => {
    expect(test.body.map((r) => r.height)).toEqual([6, 7, 8, 9, 10])
  })

  it('builds ten separate solids that face outwards and sit on the bed', () => {
    expect(volume(test.mesh)).toBeGreaterThan(0)
    expect(meshBounds(test.mesh).min[1]).toBe(0)
    expect(meshBounds(test.mesh).height).toBe(10)
  })

  it('uses thicker rings for FDM than the bare minimum wall', () => {
    const r = test.body[0]
    expect((r.outerDiameter - r.innerDiameter) / 2).toBe(2)
  })

  it('follows the cap clearance for the collar row', () => {
    const c = designReducer(structuredClone(DEFAULT_CONFIG), { type: 'patch', section: 'cap', values: { clearance: 0.5 } })
    expect(fitTestRings(c, 16).collar.map((r) => r.clearance)).toEqual([0.4, 0.45, 0.5, 0.55, 0.6])
  })
})
