import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type DesignConfig } from '@/model/config'
import { designReducer } from '@/model/reducer'
import { designChecks, printerBed, printFootprints } from './checks'

function design(patch: { [S in keyof DesignConfig]?: Partial<DesignConfig[S]> } = {}): DesignConfig {
  let c = structuredClone(DEFAULT_CONFIG)
  for (const [section, values] of Object.entries(patch)) {
    c = designReducer(c, { type: 'patch', section, values } as never)
  }
  return c
}
const ids = (c: DesignConfig) => designChecks(c).map((x) => x.id)

describe('designChecks', () => {
  it('is clear for the default design', () => {
    expect(designChecks(design())).toEqual([])
  })

  it('warns about a steep rounded base on FDM, not on SLS', () => {
    const steep = { baseExtra: 40, shoulderExtra: 40, cornerRadius: 15 }
    expect(ids(design({ shape: steep }))).toContain('overhang')
    expect(ids(design({ shape: steep, manufacturing: { technology: 'sls' } }))).not.toContain('overhang')
  })

  it('notes a cap that had to grow over the pump', () => {
    expect(ids(design({ cap: { height: 15 } }))).toContain('capRaised')
  })

  it('warns when the halves need glue and when cap magnets have no room', () => {
    expect(ids(design({ assembly: { method: 'halves' }, shape: { baseExtra: 4, shoulderExtra: 4 } }))).toContain('halvesGlue')
    expect(ids(design({ cap: { fit: 'magnet' }, shape: { baseExtra: 4, shoulderExtra: 4 } }))).toContain('capMagnets')
  })

  it('notes struts made thicker', () => {
    expect(ids(design({ shape: { silhouette: 'exoskeleton', strutWidth: 1.2 } }))).toContain('strutThickened')
  })

  it('checks the parts against the printer bed', () => {
    const wide = design({
      bottle: { preset: 'custom', bodyHeight: 120, bodyDiameter: 60 },
      shape: { shoulderExtra: 40, baseExtra: 40 },
      cap: { form: 'cylinder', width: 110 },
      manufacturing: { technology: 'resin' },
    })
    expect(printerBed(wide)).toEqual([190, 120, 200])
    // Each part fits, but shell + cap side by side don't: two runs
    expect(ids(wide)).not.toContain('partTooBig')
    expect(ids(wide)).toContain('separateRuns')
    expect(ids(design())).not.toContain('separateRuns')
  })

  it('lays the halves flat in the footprint', () => {
    const f = printFootprints(design({ assembly: { method: 'halves' } }))
    const front = f.find((p) => p.id === 'front')!
    const cap = f.find((p) => p.id === 'cap')!
    expect(front.z).toBeLessThan(front.y)
    expect(cap).toBeDefined()
  })
})
