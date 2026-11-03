import type { DesignConfig } from '@/model/config'

/** e.g. perfume-shell-column-30ml.stl */
export const shellFileName = (c: DesignConfig) =>
  `perfume-shell-${c.shape.silhouette}-${c.bottle.preset === 'custom' ? `d${c.bottle.bodyDiameter}` : c.bottle.preset}.stl`
