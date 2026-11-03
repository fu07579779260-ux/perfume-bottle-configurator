import type { DesignConfig } from '@/model/config'
import { TECHNOLOGY_DEFAULTS, type Silhouette } from '@/model/options'
import { meshBounds, revolve, type MeshData } from './mesh'

// The printed shell as a closed side profile swept around the Y axis.
// Y = 0 is the base of the glass bottle (= the top of the shell floor).
// The shell is a cup loaded from the top: its cavity is the glass bottle plus
// the fit clearance, so the outer skin may never come closer to the axis than
// the cavity plus the minimum wall. Bottom-loaded and two-part shells follow
// in build step 10.

export interface ShellPoint {
  r: number
  y: number
  /** Outer skin (shaped, may be squashed or faceted) or cavity side (always round) */
  side: 'outer' | 'inner'
}

export interface ShellLayout {
  silhouette: Silhouette
  /** Floor thickness under the bottle */
  floor: number
  bottomY: number
  topY: number
  height: number
  shoulderY: number
  baseRadius: number
  shoulderRadius: number
  /** Cavity radius: glass radius + clearance */
  cavityRadius: number
  /** Thinnest wall the technology prints reliably */
  minWall: number
  /** Narrowest outer radius at the top of tapering silhouettes */
  topRadius: number
  corner: number
  /**
   * Depth squash (Column, Pebble): in depth, a point at radius r sits at
   * cavity + minWall + (r − cavity − minWall) · depthFactor. The cavity stays
   * round, the wall never gets thinner than the minimum, and the widest
   * section reaches the chosen depth / width ratio where it can.
   */
  depthFactor: number
  /** Faceted Prism: number of flats, or null for a round section */
  sides: number | null
  /** Faceted Prism: total turn from base to rim, in radians */
  twist: number
}

/** Small rounding where the rim meets the cavity, so the edge isn't sharp. */
const RIM_EDGE = 0.4
/** Points sampled along the curved silhouettes */
const CURVE_SAMPLES = 48

const SQUASHED: readonly Silhouette[] = ['column', 'pebble']

export function shellLayout(config: DesignConfig): ShellLayout {
  const { bottle, shape, assembly, manufacturing } = config
  const tech = TECHNOLOGY_DEFAULTS[manufacturing.technology]
  const minWall = tech.minWall
  const floor = Math.max(minWall, 2)
  const cavityRadius = bottle.bodyDiameter / 2 + assembly.clearance
  const baseRadius = (bottle.bodyDiameter + shape.baseExtra) / 2
  const shoulderRadius = (bottle.bodyDiameter + shape.shoulderExtra) / 2
  const height = bottle.bodyHeight + shape.heightExtra
  const bottomY = -floor
  const topY = bottomY + height
  const shoulderY = bottomY + (height * shape.shoulderHeight) / 100
  const topRadius = Math.min(shoulderRadius, cavityRadius + minWall + 1.2)

  // The rounding can't eat the whole rim or more than a quarter of the height
  const rim = Math.min(baseRadius, shoulderRadius) - cavityRadius
  const corner = Math.max(0, Math.min(shape.cornerRadius, rim - RIM_EDGE - 0.2, height / 4))

  const widest = Math.max(baseRadius, shoulderRadius)
  const firm = cavityRadius + minWall
  const ratio = SQUASHED.includes(shape.silhouette) ? shape.sectionRatio : 1
  const depthFactor = widest <= firm ? 1 : Math.min(1, Math.max(0, (ratio * widest - firm) / (widest - firm)))

  const prism = shape.silhouette === 'prism'
  return {
    silhouette: shape.silhouette,
    floor,
    bottomY,
    topY,
    height,
    shoulderY,
    baseRadius,
    shoulderRadius,
    cavityRadius,
    minWall,
    topRadius,
    corner,
    depthFactor,
    sides: prism ? shape.prismSides : null,
    twist: prism ? (shape.prismTwist * Math.PI) / 180 : 0,
  }
}

type Corner = { r: number; y: number; round: number; side: ShellPoint['side'] }

/** Replace each corner by a quadratic curve that starts and ends `round` mm away from it. */
function roundCorners(corners: Corner[], segments = 8): ShellPoint[] {
  const out: ShellPoint[] = []
  corners.forEach((c, i) => {
    const prev = corners[i - 1]
    const next = corners[i + 1]
    if (!prev || !next || c.round <= 0) {
      out.push({ r: c.r, y: c.y, side: c.side })
      return
    }
    const lenIn = Math.hypot(c.r - prev.r, c.y - prev.y)
    const lenOut = Math.hypot(next.r - c.r, next.y - c.y)
    const d = Math.min(c.round, lenIn / 2, lenOut / 2)
    const a = { r: c.r - ((c.r - prev.r) / lenIn) * d, y: c.y - ((c.y - prev.y) / lenIn) * d }
    const b = { r: c.r + ((next.r - c.r) / lenOut) * d, y: c.y + ((next.y - c.y) / lenOut) * d }
    for (let s = 0; s <= segments; s++) {
      const t = s / segments
      const u = 1 - t
      out.push({
        r: u * u * a.r + 2 * u * t * c.r + t * t * b.r,
        y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
        side: c.side,
      })
    }
  })
  return out
}

const smoothstep = (u: number) => u * u * (3 - 2 * u)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Outer radius of the curved silhouettes at t = 0 (base) … 1 (rim). */
function curveRadius(l: ShellLayout, t: number): number {
  const sh = (l.shoulderY - l.bottomY) / l.height
  if (l.silhouette === 'teardrop') {
    // Belly low down, then a long taper that arrives upright at a narrow rim
    const belly = clamp(sh * 0.5, 0.2, 0.5)
    if (t < belly) return l.baseRadius + (l.shoulderRadius - l.baseRadius) * Math.sin(((t / belly) * Math.PI) / 2)
    const u = (t - belly) / (1 - belly)
    return l.topRadius + (l.shoulderRadius - l.topRadius) * (1 - smoothstep(u))
  }
  // Pebble: a soft swell up to the widest point, then a domed top
  const widest = clamp(sh * 0.7, 0.3, 0.65)
  if (t < widest) return l.baseRadius + (l.shoulderRadius - l.baseRadius) * Math.sin(((t / widest) * Math.PI) / 2)
  const u = (t - widest) / (1 - widest)
  return l.topRadius + (l.shoulderRadius - l.topRadius) * Math.sqrt(Math.max(0, 1 - u ** 2.4))
}

/** Outer corners from the base edge up to the rim edge. */
function outerCorners(l: ShellLayout): Corner[] {
  if (l.silhouette === 'teardrop' || l.silhouette === 'pebble') {
    const out: Corner[] = []
    for (let i = 0; i <= CURVE_SAMPLES; i++) {
      const t = i / CURVE_SAMPLES
      const edge = i === 0 || i === CURVE_SAMPLES
      out.push({ r: curveRadius(l, t), y: l.bottomY + t * l.height, round: edge ? l.corner : 0, side: 'outer' })
    }
    return out
  }
  // Column and Faceted Prism: base → shoulder → straight up to the rim
  return [
    { r: l.baseRadius, y: l.bottomY, round: l.corner, side: 'outer' },
    { r: l.shoulderRadius, y: l.shoulderY, round: l.corner, side: 'outer' },
    { r: l.shoulderRadius, y: l.topY, round: l.corner, side: 'outer' },
  ]
}

/**
 * The whole closed profile: from the axis under the base, out and up the
 * outer skin, across the rim, down the cavity, and across the floor back to
 * the axis. The outer skin never comes closer than cavity + minimum wall.
 */
export function shellProfile(config: DesignConfig): ShellPoint[] {
  const l = shellLayout(config)
  const firm = l.cavityRadius + l.minWall
  const outer = outerCorners(l).map((c) => ({ ...c, r: Math.max(c.r, firm) }))
  return roundCorners([
    { r: 0, y: l.bottomY, round: 0, side: 'outer' },
    ...outer,
    { r: l.cavityRadius, y: l.topY, round: RIM_EDGE, side: 'inner' },
    { r: l.cavityRadius, y: 0, round: 0, side: 'inner' },
    { r: 0, y: 0, round: 0, side: 'inner' },
  ])
}

/** Depth (Z) radius of a point at radius r after the squash. */
function depthRadius(l: ShellLayout, r: number): number {
  const firm = l.cavityRadius + l.minWall
  return r <= firm ? r : firm + (r - firm) * l.depthFactor
}

/** Segments per turn: a multiple of the prism's sides, so every corner is sampled. */
const roundSegments = (l: ShellLayout, segments: number) =>
  l.sides ? Math.ceil(segments / l.sides) * l.sides : segments

/** Sweep the profile around Y into a closed, watertight cup with outward-facing triangles. */
export function buildShellMesh(config: DesignConfig, segments = 96): MeshData {
  const l = shellLayout(config)
  const sides = l.sides
  const sector = sides ? (Math.PI * 2) / sides : 0

  const place = (p: ShellPoint, a: number): [number, number] => {
    if (sides) {
      // Polygon with its flats at radius r; points near the cavity stay round
      const turn = l.twist * ((p.y - l.bottomY) / l.height)
      const rel = (((a - turn) % sector) + sector) % sector - sector / 2
      const k = clamp((p.r - l.cavityRadius) / l.minWall, 0, 1)
      const rp = p.r * (1 + k * (1 / Math.cos(rel) - 1))
      return [Math.cos(a) * rp, Math.sin(a) * rp]
    }
    return [Math.cos(a) * p.r, Math.sin(a) * depthRadius(l, p.r)]
  }
  // Turning each ring with the twist keeps the polygon corners on vertices
  const angleAt = (p: ShellPoint) => l.twist * ((p.y - l.bottomY) / l.height)

  return revolve(shellProfile(config), roundSegments(l, segments), place, angleAt)
}

export interface WallCheck {
  /** Thinnest side wall around the bottle (on a flat, or in the squashed depth direction) */
  minWall: number
  floor: number
  /** Technology minimum */
  required: number
  ok: boolean
}

export function checkWall(config: DesignConfig): WallCheck {
  const l = shellLayout(config)
  let minWall = Infinity
  for (const p of shellProfile(config)) {
    // Side wall beside the bottle, below the rounded rim
    if (p.side !== 'outer' || p.y < 0 || p.y > l.topY - l.corner) continue
    const reach = l.sides ? p.r : depthRadius(l, p.r)
    minWall = Math.min(minWall, reach - l.cavityRadius)
  }
  minWall = Number(minWall.toFixed(3))
  return { minWall, floor: l.floor, required: l.minWall, ok: minWall >= l.minWall - 1e-6 && l.floor >= l.minWall }
}

export interface OverhangCheck {
  /** Steepest outward lean of the outer skin, in degrees from vertical */
  maxAngle: number
  /** Technology limit, or null when supports or powder carry overhangs */
  limit: number | null
  ok: boolean
}

/** How far the outer skin leans outwards going up; FDM prints up to about 45° without supports. */
export function checkOverhang(config: DesignConfig): OverhangCheck {
  const l = shellLayout(config)
  const limit = TECHNOLOGY_DEFAULTS[config.manufacturing.technology].maxOverhang
  const outer = shellProfile(config).filter((p) => p.side === 'outer' && p.r > 0)
  let maxAngle = 0
  for (let i = 1; i < outer.length; i++) {
    const a = outer[i - 1]
    const b = outer[i]
    // The first layers sit on the bed; the rim rounding leans inwards
    if (a.y < l.bottomY + 2 || b.y <= a.y || b.r <= a.r) continue
    maxAngle = Math.max(maxAngle, (Math.atan2(b.r - a.r, b.y - a.y) * 180) / Math.PI)
  }
  maxAngle = Math.round(maxAngle)
  return { maxAngle, limit, ok: limit === null || maxAngle <= limit }
}

export interface ShellSize {
  width: number
  depth: number
  height: number
}

/** Outer size of the shell, measured on the mesh (faceted and twisted sections included). */
export function shellSize(config: DesignConfig, mesh = buildShellMesh(config)): ShellSize {
  const b = meshBounds(mesh)
  return { width: b.width, depth: b.depth, height: b.height }
}
