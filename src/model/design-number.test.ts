import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { designCode } from './design-number'
import { designReducer } from './reducer'

describe('designCode', () => {
  it('is short, readable and stable for the same design', () => {
    const code = designCode(DEFAULT_CONFIG)
    expect(code).toMatch(/^PB-[0-9A-HJKMNP-TV-Z]{5}$/)
    expect(designCode(structuredClone(DEFAULT_CONFIG))).toBe(code)
  })

  it('changes when the design changes', () => {
    const other = designReducer(structuredClone(DEFAULT_CONFIG), { type: 'patch', section: 'shape', values: { heightExtra: 20 } })
    expect(designCode(other)).not.toBe(designCode(DEFAULT_CONFIG))
  })
})
