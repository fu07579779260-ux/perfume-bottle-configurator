import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { BOTTLE_DIMENSIONS } from './options'
import { designReducer } from './reducer'

const start = () => structuredClone(DEFAULT_CONFIG)

describe('designReducer', () => {
  it('patches one section and clamps values', () => {
    const next = designReducer(start(), { type: 'patch', section: 'shape', values: { heightExtra: 99 } })
    expect(next.shape.heightExtra).toBe(40)
    expect(next.cap).toEqual(DEFAULT_CONFIG.cap)
  })

  it('fills in the dimensions of a chosen bottle preset', () => {
    const next = designReducer(start(), { type: 'patch', section: 'bottle', values: { preset: '50ml' } })
    expect(next.bottle).toEqual({ preset: '50ml', ...BOTTLE_DIMENSIONS['50ml'] })
  })

  it('turns the preset into custom when a dimension is edited', () => {
    const next = designReducer(start(), { type: 'patch', section: 'bottle', values: { bodyDiameter: 32 } })
    expect(next.bottle.preset).toBe('custom')
    expect(next.bottle.bodyDiameter).toBe(32)
  })

  it('applies the recommended assembly method for a new silhouette', () => {
    const next = designReducer(start(), { type: 'patch', section: 'shape', values: { silhouette: 'exoskeleton' } })
    expect(next.assembly.method).toBe('halves')
  })

  it('lets the user override the assembly method afterwards', () => {
    let s = designReducer(start(), { type: 'patch', section: 'shape', values: { silhouette: 'teardrop' } })
    s = designReducer(s, { type: 'patch', section: 'assembly', values: { method: 'halves' } })
    expect(s.assembly.method).toBe('halves')
  })

  it('applies the technology defaults when the technology changes', () => {
    const next = designReducer(start(), { type: 'patch', section: 'manufacturing', values: { technology: 'resin' } })
    expect(next.assembly.clearance).toBe(0.25)
    expect(next.cap.clearance).toBe(0.25)
    expect(next.manufacturing.material).toBe('standard')
    expect(next.manufacturing.printer).toBe('generic')
  })

  it('resets a texture that does not suit the new silhouette', () => {
    let s = designReducer(start(), { type: 'patch', section: 'texture', values: { type: 'fluted' } })
    s = designReducer(s, { type: 'patch', section: 'shape', values: { silhouette: 'coral' } })
    expect(s.texture.type).toBe('smooth')
  })

  it('loads and resets', () => {
    const loaded = designReducer(start(), { type: 'load', config: { cap: { form: 'gem' } } })
    expect(loaded.cap.form).toBe('gem')
    expect(designReducer(loaded, { type: 'reset' })).toEqual(DEFAULT_CONFIG)
  })
})
