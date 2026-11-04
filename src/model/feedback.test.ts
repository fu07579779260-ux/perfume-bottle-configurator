import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type DesignConfig } from './config'
import { applyFeedback } from './feedback'
import { designReducer } from './reducer'

function design(patch: { [S in keyof DesignConfig]?: Partial<DesignConfig[S]> } = {}): DesignConfig {
  let c = structuredClone(DEFAULT_CONFIG)
  for (const [section, values] of Object.entries(patch)) {
    c = designReducer(c, { type: 'patch', section, values } as never)
  }
  return c
}

describe('applyFeedback', () => {
  it('changes nothing when both fit', () => {
    const r = applyFeedback(DEFAULT_CONFIG, { shell: 'good', cap: 'good' })
    expect(r.config).toEqual(DEFAULT_CONFIG)
    expect(r.shell).toBeNull()
    expect(r.cap).toBeNull()
  })

  it('opens a tight shell by 0.1 mm and closes a loose one by 0.05 mm', () => {
    expect(applyFeedback(DEFAULT_CONFIG, { shell: 'tight', cap: 'good' }).shell).toEqual({ from: 0.35, to: 0.45 })
    expect(applyFeedback(DEFAULT_CONFIG, { shell: 'loose', cap: 'good' }).shell).toEqual({ from: 0.35, to: 0.3 })
  })

  it('does the same for the cap: stuck opens, falling off closes', () => {
    const stuck = applyFeedback(DEFAULT_CONFIG, { shell: 'good', cap: 'stuck' })
    expect(stuck.cap).toEqual({ from: 0.35, to: 0.45 })
    expect(stuck.config.cap.clearance).toBe(0.45)
    expect(applyFeedback(DEFAULT_CONFIG, { shell: 'good', cap: 'falls' }).config.cap.clearance).toBe(0.3)
  })

  it('suggests friction ribs when a top-loaded shell is still loose at the smallest clearance', () => {
    const c = design({ assembly: { method: 'top', clearance: 0.2 } })
    const r = applyFeedback(c, { shell: 'loose', cap: 'good' })
    expect(r.shell).toBeNull()
    expect(r.tips).toEqual(['ribs'])
  })

  it('suggests a snap cap when a friction cap still falls off at the smallest clearance', () => {
    const r = applyFeedback(design({ cap: { clearance: 0.2, fit: 'friction' } }), { shell: 'good', cap: 'falls' })
    expect(r.tips).toEqual(['snapCap'])
  })

  it('stops at the largest clearance and says so', () => {
    const r = applyFeedback(design({ assembly: { clearance: 0.55 } }), { shell: 'tight', cap: 'good' })
    expect(r.shell).toEqual({ from: 0.55, to: 0.6 })
    expect(r.tips).toEqual(['glassSmaller'])
  })
})
