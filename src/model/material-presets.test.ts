import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { applyMaterialPreset, MATERIAL_PRESETS } from './material-presets'
import { MATERIALS } from './options'

describe('material presets', () => {
  it.each(MATERIAL_PRESETS)('keeps $id printable and preserves the personalised design', (preset) => {
    const original = structuredClone(DEFAULT_CONFIG)
    original.personal.text = 'LM'
    original.personal.shellColour = '#2b7a74'
    const next = applyMaterialPreset(original, preset.id)
    expect(MATERIALS[next.manufacturing.technology]).toContain(next.manufacturing.material)
    expect(next.personal.finish).toBe(preset.finish)
    expect(next.personal.text).toBe('LM')
    expect(next.personal.shellColour).toBe('#2b7a74')
    expect(next.bottle).toEqual(original.bottle)
    expect(next.shape).toEqual(original.shape)
    expect(next.texture).toEqual(original.texture)
  })

  it('applies PETG after switching from resin instead of reverting to the FDM default PLA', () => {
    const resin = applyMaterialPreset(DEFAULT_CONFIG, 'standard')
    const next = applyMaterialPreset(resin, 'petg')
    expect(next.manufacturing).toEqual({ technology: 'fdm', material: 'petg', printer: 'generic' })
    expect(next.assembly.clearance).toBe(0.35)
    expect(next.personal.finish).toBe('silk')
  })

  it('preserves tuned clearances and the printer when changing material within one process', () => {
    const original = structuredClone(DEFAULT_CONFIG)
    original.assembly.clearance = 0.5
    original.cap.clearance = 0.45
    original.manufacturing.printer = 'bambu-a1'
    const next = applyMaterialPreset(original, 'petg')
    expect(next.assembly.clearance).toBe(0.5)
    expect(next.cap.clearance).toBe(0.45)
    expect(next.manufacturing.printer).toBe('bambu-a1')
  })
})
