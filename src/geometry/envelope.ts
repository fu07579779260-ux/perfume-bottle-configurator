import type { BottleConfig } from '@/model/config'
import { neckRadius, pumpLayout } from './bottle'

// The space the glass bottle and its pump take up, as a radius at each
// height (Y = 0 at the bottle's base). Shells that wrap over the shoulder
// (bottom-loaded and two halves) shape their cavity from it.

/** Stem between the pump collar and the push button. */
const STEM_RADIUS = 1.6

/** Height where the shoulder rounding starts. */
export function shoulderStart(b: BottleConfig): number {
  const r = b.bodyDiameter / 2
  const rs = Math.min(b.shoulderRadius, r - neckRadius(b), b.bodyHeight / 2)
  return b.bodyHeight - rs
}

/** Radius of glass + pump at height y; 0 above the push button. */
export function envelopeRadius(b: BottleConfig, y: number): number {
  const r = b.bodyDiameter / 2
  const s0 = shoulderStart(b)
  const rs = b.bodyHeight - s0
  const pump = pumpLayout(b)
  if (y <= s0) return r
  if (y <= b.bodyHeight) return r - rs + Math.sqrt(Math.max(0, rs * rs - (y - s0) ** 2))
  if (y <= pump.collar.bottom) return neckRadius(b)
  if (y <= pump.collar.bottom + pump.collar.height) return pump.collar.radius
  if (y <= pump.actuator.bottom) return STEM_RADIUS
  if (y <= pump.top) return pump.actuator.radius
  return 0
}

/**
 * Cavity radius of a wrapping shell at height y: the envelope plus the
 * clearance, and above the shoulder never less than a 45° cone, so the roof
 * over the shoulder prints without supports and the bottle still can't pass.
 */
export function wrapCavityRadius(b: BottleConfig, clearance: number, y: number): number {
  const cone = b.bodyDiameter / 2 + clearance - Math.max(0, y - shoulderStart(b))
  return Math.max(envelopeRadius(b, y) + clearance, cone)
}

/** The highest the shell top may go and still leave the push button free to press. */
export function maxWrapTop(b: BottleConfig): number {
  return pumpLayout(b).top - 4
}
