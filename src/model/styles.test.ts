import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { sanitizeConfig } from './sanitize'
import { applyStyle, STYLES } from './styles'

describe('applyStyle', () => {
  it.each(STYLES)('%s gives a valid design', (style) => {
    const c = applyStyle(structuredClone(DEFAULT_CONFIG), style)
    expect(sanitizeConfig(c)).toEqual(c)
  })

  it('brings the silhouette with its recommended assembly', () => {
    const c = applyStyle(structuredClone(DEFAULT_CONFIG), 'luxury')
    expect(c.shape.silhouette).toBe('exoskeleton')
    expect(c.assembly.method).toBe('halves')
    expect(c.personal.finish).toBe('metallic')
  })

  it('keeps what the style does not set, like the bottle and the text', () => {
    const start = { ...structuredClone(DEFAULT_CONFIG), personal: { ...DEFAULT_CONFIG.personal, text: 'Lin' } }
    const c = applyStyle(start, 'natural')
    expect(c.personal.text).toBe('Lin')
    expect(c.bottle).toEqual(DEFAULT_CONFIG.bottle)
  })
})
