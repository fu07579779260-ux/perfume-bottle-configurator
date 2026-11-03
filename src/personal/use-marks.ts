import { useMemo } from 'react'
import type { Marks } from '@/geometry/marks'
import type { DesignConfig } from '@/model/config'
import { designCode } from '@/model/design-number'
import { useLogo } from './logo-store'
import { scaleOutline, textOutline } from './raster'

/** Font size of the engraved design number, in mm */
const NUMBER_SIZE = 3.5

/** The traced outlines of the design's text, logo and design number. */
export function useMarks(config: DesignConfig): Marks {
  const p = config.personal
  const logo = useLogo()
  const code = designCode(config)

  const text = useMemo(() => (p.text.trim() ? textOutline(p.text, p.textSize) : null), [p.text, p.textSize])
  const number = useMemo(() => (p.designNumber ? textOutline(code, NUMBER_SIZE, 'number') : null), [p.designNumber, code])
  const logoOutline = useMemo(
    () => (logo && p.logoName === logo.name ? scaleOutline(logo.outline, p.logoSize) : null),
    [logo, p.logoName, p.logoSize],
  )
  return useMemo(() => ({ text, logo: logoOutline, number }), [text, logoOutline, number])
}
