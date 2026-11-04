import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, RANGES } from './config'
import { clampToRange, sanitizeConfig, sanitizeProfilePoints, sanitizeText } from './sanitize'

describe('clampToRange', () => {
  it('clamps and snaps to the step', () => {
    expect(clampToRange(0.9, RANGES.assembly.clearance)).toBe(0.6)
    expect(clampToRange(0.33, RANGES.assembly.clearance)).toBe(0.35)
    expect(clampToRange(3.2, RANGES.shape.prismSides)).toBe(5)
  })
})

describe('sanitizeConfig', () => {
  it('returns the defaults for garbage', () => {
    expect(sanitizeConfig(null)).toEqual(DEFAULT_CONFIG)
    expect(sanitizeConfig('nope')).toEqual(DEFAULT_CONFIG)
    expect(sanitizeConfig({ shape: 'x', extra: 1 })).toEqual(DEFAULT_CONFIG)
  })

  it('fills missing fields and drops unknown ones', () => {
    const c = sanitizeConfig({ shape: { silhouette: 'pebble', colour: 'red' } })
    expect(c.shape.silhouette).toBe('pebble')
    expect(c.shape.heightExtra).toBe(DEFAULT_CONFIG.shape.heightExtra)
    expect('colour' in c.shape).toBe(false)
  })

  it('rejects unknown enum values and bad colours', () => {
    const c = sanitizeConfig({
      shape: { silhouette: 'cube' },
      personal: { shellColour: 'teal', capColour: '#ABCDEF' },
    })
    expect(c.shape.silhouette).toBe('column')
    expect(c.personal.shellColour).toBe(DEFAULT_CONFIG.personal.shellColour)
    expect(c.personal.capColour).toBe('#abcdef')
  })

  it('marks a preset as custom when its dimensions were changed', () => {
    expect(sanitizeConfig({ bottle: { preset: '30ml', bodyDiameter: 31 } }).bottle.preset).toBe('custom')
    expect(sanitizeConfig({ bottle: { preset: '30ml' } }).bottle.preset).toBe('30ml')
  })

  it('keeps texture choices in basic mode while reserving bands for advanced mode', () => {
    const basic = sanitizeConfig({ shape: { silhouette: 'coral' }, texture: { type: 'fluted', zone: 'bands' } })
    expect(basic.texture.type).toBe('fluted')
    expect(basic.texture.zone).toBe('whole')

    const advanced = sanitizeConfig({
      mode: { advanced: true },
      shape: { silhouette: 'coral' },
      texture: { type: 'fluted', zone: 'bands' },
    })
    expect(advanced.texture.type).toBe('fluted')
    expect(advanced.texture.zone).toBe('bands')
  })

  it('keeps printer and material valid for the technology', () => {
    const c = sanitizeConfig({ manufacturing: { technology: 'resin', printer: 'bambu-x1', material: 'pla' } })
    expect(c.manufacturing.printer).toBe('generic')
    expect(c.manufacturing.material).toBe('standard')
  })
})

describe('sanitizeText', () => {
  it('keeps at most two lines of twelve characters', () => {
    expect(sanitizeText('ABCDEFGHIJKLMNOP\nsecond\nthird')).toBe('ABCDEFGHIJKL\nsecond')
  })

  it('counts Chinese characters and emoji as one each', () => {
    expect(sanitizeText('一二三四五六七八九十十一十二')).toBe('一二三四五六七八九十十一')
    expect(sanitizeText('🌊'.repeat(14))).toBe('🌊'.repeat(12))
  })

  it('drops carriage returns', () => {
    expect(sanitizeText('A\r\nB')).toBe('A\nB')
  })
})

describe('sanitizeProfilePoints', () => {
  it('accepts 4 to 10 points, clamps them to 0…1 and sorts by height', () => {
    expect(sanitizeProfilePoints([[1, 0.5], [0, 2], [0.5, -1], [0.25, 0.123456]])).toEqual([
      [0, 1],
      [0.25, 0.123],
      [0.5, 0],
      [1, 0.5],
    ])
  })

  it('rejects too few points or malformed ones', () => {
    expect(sanitizeProfilePoints([[0, 0], [1, 1]])).toBeNull()
    expect(sanitizeProfilePoints([[0, 0], [0.3, 'x'], [0.6, 1], [1, 1]])).toBeNull()
    expect(sanitizeProfilePoints('points')).toBeNull()
  })
})
