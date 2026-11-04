import type { DesignConfig } from '@/model/config'

const bottleTag = (c: DesignConfig) => (c.bottle.preset === 'custom' ? `d${c.bottle.bodyDiameter}` : c.bottle.preset)

/** e.g. perfume-fit-rings-30ml.stl */
export const fitRingsFileName = (c: DesignConfig) => `perfume-fit-rings-${bottleTag(c)}.stl`
