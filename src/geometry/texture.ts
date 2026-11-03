import type { DesignConfig } from '@/model/config'
import type { Texture } from '@/model/options'

// Surface textures as a radial offset of the outer skin (PLAN.md §4.4).
// Grooves and facets cut in (negative), waves go both ways; the shell clamps
// the result so the wall never gets thinner than the technology minimum.

export interface TextureSpan {
  /** Bottom and top of the textured band (below the rim and the cap seat) */
  from: number
  to: number
  /** Where the lower and upper textures meet (zones), in Y */
  split: number
  /** Mean outer radius, for sizing facets */
  radius: number
}

/** Fade at the ends of the band, so the texture runs out smoothly. */
const FADE = 2.5

const smoothstep = (u: number) => {
  const t = Math.min(1, Math.max(0, u))
  return t * t * (3 - 2 * t)
}
const frac = (v: number) => v - Math.floor(v)

/** Offset of one texture at height y and angle a (radians), on a skin of radius r. */
function offsetOf(config: DesignConfig, type: Texture, span: TextureSpan, y: number, a: number, r: number): number {
  const t = config.texture
  const turn = a / (Math.PI * 2)
  switch (type) {
    case 'fluted': {
      // Rounded grooves, each taking 80% of its share of the circumference
      const u = frac(t.fluteCount * turn) - 0.5
      return Math.abs(u) < 0.4 ? -t.fluteDepth * Math.cos((Math.PI * u) / 0.8) ** 2 : 0
    }
    case 'facets': {
      // Flat cuts whose corners stay on the round skin; every tier zig-zags by
      // half a facet, so the faces read like a cut stone
      const n = t.facetCount
      const sector = (Math.PI * 2) / n
      const tier = ((Math.PI * 2 * span.radius) / n) * 1.2
      const zig = (sector / 2) * (1 - Math.abs(2 * frac((y - span.from) / (2 * tier)) - 1))
      const rel = ((((a - zig) % sector) + sector) % sector) - sector / 2
      return r * (Math.cos(Math.PI / n) / Math.cos(rel) - 1)
    }
    case 'waves': {
      const phase = (y - span.from) / t.waveLength + (t.waveDirection === 'spiral' ? 3 * turn : 0)
      return t.waveAmplitude * Math.sin(Math.PI * 2 * phase)
    }
    default:
      return 0
  }
}

/** Texture offset of the outer skin at (y, a) for a skin of radius r. */
export function textureOffset(config: DesignConfig, span: TextureSpan, y: number, a: number, r: number): number {
  if (y <= span.from || y >= span.to) return 0
  const fade = smoothstep((y - span.from) / FADE) * smoothstep((span.to - y) / FADE)
  const { type, zone, upperType } = config.texture
  if (zone === 'whole') return fade * offsetOf(config, type, span, y, a, r)
  // Lower part only, or two bands that cross-fade over 2 mm at the split
  const upper = zone === 'bands' ? upperType : 'smooth'
  const mix = smoothstep((y - span.split + 1) / 2)
  const lower = offsetOf(config, type, span, y, a, r)
  const top = upper === 'smooth' ? 0 : offsetOf(config, upper, span, y, a, r)
  return fade * (lower * (1 - mix) + top * mix)
}

/** The textures actually used at some height (one, or two with bands). */
function usedTextures(config: DesignConfig): Texture[] {
  const t = config.texture
  return t.zone === 'bands' ? [t.type, t.upperType] : [t.type]
}

/** Segments per turn that resolve the texture; `base` is 96 for the preview, 192 for export. */
export function textureSegments(config: DesignConfig, base: number): number {
  const t = config.texture
  const scale = base / 96
  let need = base
  for (const type of usedTextures(config)) {
    if (type === 'fluted') need = Math.max(need, t.fluteCount * 5 * scale)
    if (type === 'facets') need = Math.max(need, t.facetCount * 4 * scale)
  }
  return Math.min(480, Math.ceil(need))
}

/** Longest vertical step of the outer profile that still resolves the texture. */
export function textureStep(config: DesignConfig, span: TextureSpan): number {
  let step = 2
  for (const type of usedTextures(config)) {
    if (type === 'waves') step = Math.min(step, config.texture.waveLength / 12)
    if (type === 'facets') step = Math.min(step, ((Math.PI * 2 * span.radius) / config.texture.facetCount) * 0.15)
  }
  return Math.max(0.3, step)
}
