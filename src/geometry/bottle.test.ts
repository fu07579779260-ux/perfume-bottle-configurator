import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type BottleConfig } from '@/model/config'
import { BOTTLE_DIMENSIONS } from '@/model/options'
import { bottleTotalHeight, glassProfile, liquidProfile, neckRadius, pumpLayout } from './bottle'

const bottles: BottleConfig[] = (['10ml', '30ml', '50ml'] as const).map((p) => ({ preset: p, ...BOTTLE_DIMENSIONS[p] }))

describe('glassProfile', () => {
  it.each(bottles)('runs from the axis at the base to the axis at the top ($preset)', (b) => {
    const p = glassProfile(b)
    expect(p[0]).toEqual([0, 0])
    expect(p[p.length - 1]).toEqual([0, b.bodyHeight + b.neckHeight])
    // Never wider than the body, never below the base
    for (const [r, y] of p) {
      expect(r).toBeLessThanOrEqual(b.bodyDiameter / 2 + 1e-9)
      expect(y).toBeGreaterThanOrEqual(-1e-9)
    }
    // Heights only go up, so the lathe doesn't fold back on itself
    for (let i = 1; i < p.length; i++) expect(p[i][1]).toBeGreaterThanOrEqual(p[i - 1][1] - 1e-9)
  })

  it('keeps a sharp shoulder when the radius is 0', () => {
    const b = { ...DEFAULT_CONFIG.bottle, shoulderRadius: 0 }
    expect(glassProfile(b)).toContainEqual([b.bodyDiameter / 2, b.bodyHeight])
  })
})

describe('neckRadius', () => {
  it('uses the thread diameter, or sits inside the collar for a custom neck', () => {
    expect(neckRadius(DEFAULT_CONFIG.bottle)).toBe(9)
    expect(neckRadius({ ...DEFAULT_CONFIG.bottle, neckFinish: 'custom', collarDiameter: 16 })).toBe(7)
  })
})

describe('liquidProfile', () => {
  it.each(bottles)('stays inside the glass and below the shoulder ($preset)', (b) => {
    for (const [r, y] of liquidProfile(b)) {
      expect(r).toBeLessThan(b.bodyDiameter / 2)
      expect(y).toBeLessThan(b.bodyHeight)
    }
  })
})

describe('pumpLayout', () => {
  it.each(bottles)('reaches the pump height above the neck ($preset)', (b) => {
    const pump = pumpLayout(b)
    expect(pump.top).toBeCloseTo(b.bodyHeight + b.neckHeight + b.pumpHeight)
    expect(pump.actuator.bottom + pump.actuator.height).toBeCloseTo(pump.top)
    expect(pump.collar.bottom).toBeGreaterThan(b.bodyHeight)
    expect(bottleTotalHeight(b)).toBe(pump.top)
  })
})
