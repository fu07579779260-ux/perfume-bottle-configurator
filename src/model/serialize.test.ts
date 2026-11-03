import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type DesignConfig } from './config'
import { designReducer } from './reducer'
import {
  buildShareUrl,
  decodeShareParam,
  encodeShareParam,
  parseDesignFile,
  parseParameterCode,
  readShareParam,
  toDesignFile,
  toParameterCode,
} from './serialize'

function sample(): DesignConfig {
  let c = structuredClone(DEFAULT_CONFIG)
  c = designReducer(c, { type: 'patch', section: 'mode', values: { advanced: true } })
  c = designReducer(c, { type: 'patch', section: 'shape', values: { silhouette: 'pebble', profilePoints: [[0, 0.4], [0.3, 1], [0.7, 0.9], [1, 0.3]] } })
  c = designReducer(c, { type: 'patch', section: 'personal', values: { text: 'Lin 林\n2026', liquidColour: '#88ccbb' } })
  return c
}

describe('design file', () => {
  it('round-trips', () => {
    const c = sample()
    expect(parseDesignFile(toDesignFile(c))).toEqual({ ok: true, config: c })
  })

  it('reports why a file cannot be read', () => {
    expect(parseDesignFile('{')).toEqual({ ok: false, error: 'invalid-json' })
    expect(parseDesignFile('{"format":"keycap-configurator","config":{}}')).toEqual({ ok: false, error: 'not-a-design' })
    expect(parseDesignFile('{"format":"perfume-configurator","version":99,"config":{}}')).toEqual({
      ok: false,
      error: 'newer-version',
    })
  })
})

describe('share link', () => {
  it('round-trips, including Chinese text and profile points', () => {
    const c = sample()
    expect(decodeShareParam(encodeShareParam(c).param)).toEqual(c)
  })

  it('encodes only values that differ from the defaults', () => {
    expect(encodeShareParam(DEFAULT_CONFIG).param).toBe('e30') // "{}"
  })

  it('drops the uploaded logo and says so', () => {
    const c = designReducer(sample(), { type: 'patch', section: 'personal', values: { logoName: 'brand.svg' } })
    const { param, droppedLogo } = encodeShareParam(c)
    expect(droppedLogo).toBe(true)
    expect(decodeShareParam(param)?.personal.logoName).toBeNull()
  })

  it('builds a URL that can be read back', () => {
    const { url } = buildShareUrl(sample(), 'https://example.com/perfume-bottle-configurator/#/guide')
    expect(url.startsWith('https://example.com/perfume-bottle-configurator/#/configure?c=')).toBe(true)
    const param = readShareParam(url.slice(url.indexOf('#')))
    expect(param && decodeShareParam(param)).toEqual(sample())
  })

  it('returns null for an unreadable parameter', () => {
    expect(decodeShareParam('%%%')).toBeNull()
  })
})

describe('parameter code', () => {
  it('round-trips and tolerates spaces around it', () => {
    const { code } = toParameterCode(sample())
    expect(code.startsWith('PB1-')).toBe(true)
    expect(parseParameterCode(`  ${code}\n`)).toEqual(sample())
  })

  it('also accepts a whole share link', () => {
    const { url } = buildShareUrl(sample(), 'https://example.com/app/')
    expect(parseParameterCode(url)).toEqual(sample())
  })

  it('returns null for anything else', () => {
    expect(parseParameterCode('hello')).toBeNull()
  })
})
