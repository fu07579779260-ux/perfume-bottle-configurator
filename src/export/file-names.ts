import type { DesignConfig } from '@/model/config'

const bottleTag = (c: DesignConfig) => (c.bottle.preset === 'custom' ? `d${c.bottle.bodyDiameter}` : c.bottle.preset)

/** e.g. perfume-shell-column-30ml.stl */
export const shellFileName = (c: DesignConfig) => `perfume-shell-${c.shape.silhouette}-${bottleTag(c)}.stl`

/** e.g. perfume-fit-rings-30ml.stl */
export const fitRingsFileName = (c: DesignConfig) => `perfume-fit-rings-${bottleTag(c)}.stl`
