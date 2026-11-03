import type { BottleConfig } from '@/model/config'
import { NECK_OUTER_DIAMETER } from '@/model/options'

// Side profiles of the glass bottle for a lathe: [radius, height] in mm, from
// the axis at the base up to the axis at the top. Y = 0 is the bottle's base.

export type ProfilePoint2 = [r: number, y: number]

/** Glass wall thickness used for the liquid inside (preview only). */
export const GLASS_WALL = 2
/** Rounding of the bottom edge of the glass. */
const BASE_FILLET = 1.5
/** Share of the body height the perfume fills. */
export const FILL_LEVEL = 0.78

/** Quarter arc from `from` angle to `to` angle (degrees) around a centre. */
function arc(cx: number, cy: number, radius: number, from: number, to: number, segments = 8): ProfilePoint2[] {
  const out: ProfilePoint2[] = []
  for (let i = 0; i <= segments; i++) {
    const a = ((from + ((to - from) * i) / segments) * Math.PI) / 180
    out.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)])
  }
  return out
}

export function neckRadius(b: BottleConfig): number {
  // A custom neck sits just inside the pump collar
  const diameter = b.neckFinish === 'custom' ? b.collarDiameter - 2 : NECK_OUTER_DIAMETER[b.neckFinish]
  return Math.min(diameter, b.bodyDiameter - 2) / 2
}

/** Outer surface of the glass: base, body, rounded shoulder, neck. */
export function glassProfile(b: BottleConfig): ProfilePoint2[] {
  const r = b.bodyDiameter / 2
  const h = b.bodyHeight
  const neckR = neckRadius(b)
  // The shoulder can't round past the neck or half the body height
  const rs = Math.min(b.shoulderRadius, r - neckR, h / 2)
  const top = h + b.neckHeight

  return [
    [0, 0],
    ...arc(r - BASE_FILLET, BASE_FILLET, BASE_FILLET, -90, 0, 4),
    ...(rs > 0 ? arc(r - rs, h - rs, rs, 0, 90) : [[r, h] as ProfilePoint2]),
    [neckR, h],
    [neckR, top],
    [0, top],
  ]
}

/** The perfume inside: a flat-topped column a glass wall inside the body. */
export function liquidProfile(b: BottleConfig): ProfilePoint2[] {
  const r = b.bodyDiameter / 2 - GLASS_WALL
  const bottom = GLASS_WALL
  const top = bottom + (b.bodyHeight - GLASS_WALL - Math.max(b.shoulderRadius, 2)) * FILL_LEVEL
  return [
    [0, bottom],
    ...arc(r - 1, bottom + 1, 1, -90, 0, 3),
    [r, top],
    [0, top],
  ]
}

export interface PumpLayout {
  /** Metal collar crimped or screwed over the neck */
  collar: { radius: number; bottom: number; height: number }
  /** Push button on top */
  actuator: { radius: number; bottom: number; height: number }
  /** Highest point of the pump */
  top: number
}

export function pumpLayout(b: BottleConfig): PumpLayout {
  const neckTop = b.bodyHeight + b.neckHeight
  const collarBottom = b.bodyHeight + b.neckHeight * 0.15
  const collarHeight = neckTop - collarBottom + Math.min(4, b.pumpHeight * 0.25)
  const top = neckTop + b.pumpHeight
  const actuatorBottom = collarBottom + collarHeight + 1.5
  return {
    collar: { radius: b.collarDiameter / 2, bottom: collarBottom, height: collarHeight },
    actuator: {
      radius: Math.max(4, b.collarDiameter * 0.36),
      bottom: actuatorBottom,
      height: Math.max(2, top - actuatorBottom),
    },
    top,
  }
}

/** Total height of the glass bottle with its pump. */
export const bottleTotalHeight = (b: BottleConfig) => pumpLayout(b).top
