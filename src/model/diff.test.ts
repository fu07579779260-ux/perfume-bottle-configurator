import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { diffConfigs } from './diff'
import { designReducer } from './reducer'

describe('diffConfigs', () => {
  it('is empty for the same design', () => {
    expect(diffConfigs(DEFAULT_CONFIG, structuredClone(DEFAULT_CONFIG))).toEqual([])
  })

  it('lists each changed field with its old and new value', () => {
    let b = designReducer(structuredClone(DEFAULT_CONFIG), { type: 'patch', section: 'shape', values: { heightExtra: 20 } })
    b = designReducer(b, { type: 'patch', section: 'personal', values: { text: 'Lin' } })
    expect(diffConfigs(DEFAULT_CONFIG, b)).toEqual([
      { section: 'shape', key: 'heightExtra', from: 15, to: 20 },
      { section: 'personal', key: 'text', from: '', to: 'Lin' },
    ])
  })

  it('compares control points by value', () => {
    const a = designReducer(structuredClone(DEFAULT_CONFIG), { type: 'patch', section: 'shape', values: { profilePoints: [[0, 0.2], [0.5, 0.5], [0.8, 0.4], [1, 0.3]] } })
    const b = structuredClone(a)
    expect(diffConfigs(a, b)).toEqual([])
  })
})
