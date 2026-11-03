import type { DesignConfig } from '@/model/config'
import { TECHNOLOGY_DEFAULTS, type AssemblyMethod, type Silhouette } from '@/model/options'
import { maxWrapTop, shoulderStart, wrapCavityRadius } from './envelope'
import { meshBounds, revolve, type MeshData } from './mesh'

// The printed shell as a closed side profile swept around the Y axis.
// Y = 0 is the base of the glass bottle. How the bottle gets in decides the
// cavity (PLAN.md §4.2):
// - top-loaded: an open cup; the cavity is a straight bore, so the outside
//   can't be narrower than the bottle anywhere
// - bottom-loaded: a sleeve that wraps over the shoulder, closed by a base
//   cap that screws or snaps into its bottom opening
// - two halves: the cavity follows the bottle and pump all round; the shell
//   is cut in two later (parts.ts)
// Every shell ends in a short spigot on top; the cap's socket slides over it.

export interface ShellPoint {
  r: number
  y: number
  /**
   * outer: shaped skin (may be squashed or faceted); inner: cavity side
   * (round); thread: the bottom opening of a bottom-loaded shell (round,
   * with the thread or snap groove cut into it); fit: the outside of the
   * spigot the cap slides onto (round, with the snap bead)
   */
  side: 'outer' | 'inner' | 'thread' | 'fit'
}

/** The ring on top of the shell that the cap's socket slides over. */
export interface Spigot {
  inner: number
  outer: number
  bottomY: number
  topY: number
  /** Snap bead on the outside, or plain (friction or magnets) */
  snap: boolean
  depth: number
}

export interface BaseFit {
  kind: 'thread' | 'snap'
  /** Radius of the bottom opening at its narrowest (the bottle passes through) */
  radius: number
  /** How far the groove goes into the shell wall */
  depth: number
  /** Thread pitch (mm per turn) */
  pitch: number
  /** Radial gap between the shell and the base cap */
  clearance: number
  /** Y of the bottom edge and of the top of the opening (= bottle base) */
  bottomY: number
  topY: number
}

export interface ShellLayout {
  silhouette: Silhouette
  method: AssemblyMethod
  /** Floor or base-cap thickness under the bottle */
  floor: number
  bottomY: number
  topY: number
  height: number
  shoulderY: number
  baseRadius: number
  shoulderRadius: number
  /** Cavity radius beside the glass body: glass radius + clearance */
  cavityRadius: number
  /** Cavity radius at height y */
  cavityAt: (y: number) => number
  /** Radius of the opening in the top */
  holeRadius: number
  /** Thinnest wall the technology prints reliably */
  minWall: number
  /** Narrowest outer radius at the top of tapering silhouettes */
  topRadius: number
  corner: number
  /**
   * Depth squash (Column, Pebble): in depth, a point at radius r sits at
   * firm + (r − firm) · depthFactor, where firm = cavity + minimum wall. The
   * cavity stays round, the wall never gets thinner than the minimum, and the
   * widest section reaches the chosen depth / width ratio where it can.
   */
  depthFactor: number
  /** Faceted Prism: number of flats, or null for a round section */
  sides: number | null
  /** Faceted Prism: total turn from base to rim, in radians */
  twist: number
  /** Bottom-loaded only */
  baseFit: BaseFit | null
  /** Top-loaded only: friction ribs inside the bore */
  ribs: number
  spigot: Spigot
  /** Outer radius of the seat the cap rests on: as wide as the cap's base needs */
  seat: number
}

/** Small rounding where the rim meets the opening, so the edge isn't sharp. */
const RIM_EDGE = 0.4
/** Points sampled along the curved silhouettes */
const CURVE_SAMPLES = 48
/** Longest straight piece of outer skin before it gets extra points (for the wall clamp) */
const MAX_STEP = 2
/** Height of the base cap's plug, which is also the threaded length */
export const PLUG_HEIGHT = 6
const THREAD_PITCH = 3
const THREAD_DEPTH = 1
const SNAP_DEPTH = 0.6
/** Width of a friction rib, in mm around the bore */
const RIB_WIDTH = 2
export const SPIGOT_HEIGHT = 5
const SPIGOT_WALL = 2
/** Extra on the seat beyond the cap's own wall, so the cap never overhangs the shell */
const SEAT_MARGIN = 0.2
/** Height of the full-width seat below the top; below it the seat blends in at 45° */
const SEAT_HEIGHT = 3
const CAP_SNAP_DEPTH = 0.5

const SQUASHED: readonly Silhouette[] = ['column', 'pebble']
const smoothstep = (u: number) => u * u * (3 - 2 * u)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function shellLayout(config: DesignConfig): ShellLayout {
  const { bottle, shape, assembly, manufacturing } = config
  const method = assembly.method
  const tech = TECHNOLOGY_DEFAULTS[manufacturing.technology]
  const minWall = tech.minWall
  const c = assembly.clearance
  const cavityRadius = bottle.bodyDiameter / 2 + c
  const wraps = method !== 'top'
  const cavityAt = wraps ? (y: number) => wrapCavityRadius(bottle, c, y) : () => cavityRadius

  const floor = method === 'bottom' ? PLUG_HEIGHT : Math.max(minWall, 2)
  const bottomY = -floor
  let topY = bottomY + bottle.bodyHeight + shape.heightExtra
  // A wrapping shell must cover the shoulder and still leave the push button free
  if (wraps) topY = clamp(topY, bottle.bodyHeight + c + minWall, maxWrapTop(bottle) - SPIGOT_HEIGHT)
  const height = topY - bottomY
  const shoulderY = bottomY + (height * shape.shoulderHeight) / 100

  const spigotInner = wraps ? cavityAt(topY) : cavityRadius
  const spigot: Spigot = {
    inner: spigotInner,
    outer: spigotInner + Math.max(SPIGOT_WALL, minWall),
    bottomY: topY,
    topY: topY + SPIGOT_HEIGHT,
    snap: config.cap.fit === 'snap',
    depth: CAP_SNAP_DEPTH,
  }
  const holeRadius = wraps ? cavityAt(spigot.topY) : cavityRadius

  const baseFit: BaseFit | null =
    method === 'bottom'
      ? {
          kind: assembly.baseFixing,
          radius: cavityRadius + 0.1,
          depth: assembly.baseFixing === 'thread' ? THREAD_DEPTH : SNAP_DEPTH,
          pitch: THREAD_PITCH,
          clearance: c,
          bottomY,
          topY: 0,
        }
      : null

  const baseRadius = (bottle.bodyDiameter + shape.baseExtra) / 2
  const shoulderRadius = (bottle.bodyDiameter + shape.shoulderExtra) / 2
  const narrowest = wraps ? holeRadius : cavityRadius
  // The cap's base is its socket (spigot + clearance) plus a wall; the shell top matches it
  const seat = spigot.outer + config.cap.clearance + minWall + SEAT_MARGIN
  const topRadius = Math.min(shoulderRadius, Math.max(narrowest + minWall + 1.2, seat))

  // The rounding can't eat the whole rim or more than a quarter of the height
  const rim = Math.min(baseRadius, shoulderRadius) - cavityRadius
  const corner = Math.max(0, Math.min(shape.cornerRadius, rim - RIM_EDGE - 0.2, height / 4))

  const widest = Math.max(baseRadius, shoulderRadius)
  const firm = cavityRadius + minWall
  const ratio = SQUASHED.includes(shape.silhouette) ? shape.sectionRatio : 1
  const depthFactor = widest <= firm ? 1 : clamp((ratio * widest - firm) / (widest - firm), 0, 1)

  const prism = shape.silhouette === 'prism'
  return {
    silhouette: shape.silhouette,
    method,
    floor,
    bottomY,
    topY,
    height,
    shoulderY,
    baseRadius,
    shoulderRadius,
    cavityRadius,
    cavityAt,
    holeRadius,
    minWall,
    topRadius,
    corner,
    depthFactor,
    sides: prism ? shape.prismSides : null,
    twist: prism ? (shape.prismTwist * Math.PI) / 180 : 0,
    baseFit,
    ribs: method === 'top' ? assembly.frictionRibs : 0,
    spigot,
    seat,
  }
}

/** How far out the inside of the wall reaches at height y (cavity, or the bottom of the thread groove). */
function cavityEdge(l: ShellLayout, y: number): number {
  const f = l.baseFit
  if (f && y <= f.topY) return f.radius + f.depth
  return l.cavityAt(Math.max(y, 0))
}

/** The seat the cap rests on: full width for the top 3 mm, blending in at 45° below (0 further down). */
const seatRadius = (l: ShellLayout, y: number) => Math.max(0, l.seat - Math.max(0, l.topY - SEAT_HEIGHT - y))

/** The narrowest the outer skin may be at height y. */
function firmRadius(l: ShellLayout, y: number): number {
  return Math.max(cavityEdge(l, y) + l.minWall, seatRadius(l, y))
}

export type Corner = { r: number; y: number; round: number; side: ShellPoint['side'] }

/** Replace each corner by a quadratic curve that starts and ends `round` mm away from it. */
export function roundCorners(corners: Corner[], segments = 8): ShellPoint[] {
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

/** Cavity of a wrapping shell, from just under the spigot top down to the shoulder start. */
function wrapCavity(l: ShellLayout, bottleShoulder: number): Corner[] {
  const out: Corner[] = []
  for (let y = l.spigot.topY - 0.5; y > bottleShoulder; y -= 0.5) out.push({ r: l.cavityAt(y), y, round: 0, side: 'inner' })
  out.push({ r: l.cavityRadius, y: bottleShoulder, round: 0, side: 'inner' })
  return out
}

/** Thread zone of a bottom-loaded shell, from the bottle base down to (not including) the bottom edge. */
function threadZone(f: BaseFit): Corner[] {
  const out: Corner[] = []
  const step = f.pitch / 12
  for (let y = f.topY; y > f.bottomY + step / 2; y -= step) out.push({ r: f.radius, y, round: 0, side: 'thread' })
  return out
}

/** Add points to long outer pieces, then keep every outer point outside the firm radius. */
function settleOuter(l: ShellLayout, points: ShellPoint[]): ShellPoint[] {
  const out: ShellPoint[] = []
  points.forEach((p, i) => {
    const prev = points[i - 1]
    // The bottom face (starting on the axis) isn't skin, so it gets no extra points
    if (prev && p.side === 'outer' && prev.side === 'outer' && prev.r > 0) {
      const n = Math.ceil(Math.hypot(p.r - prev.r, p.y - prev.y) / MAX_STEP)
      for (let k = 1; k < n; k++) {
        const t = k / n
        out.push({ r: prev.r + (p.r - prev.r) * t, y: prev.y + (p.y - prev.y) * t, side: 'outer' })
      }
    }
    out.push(p)
  })
  const settled = out.map((p) => (p.side === 'outer' && p.r > 0 ? { ...p, r: Math.max(p.r, firmRadius(l, p.y)) } : p))
  // Clamping can stack points on top of each other; those would make empty triangles
  return settled.filter((p, i) => i === 0 || Math.hypot(p.r - settled[i - 1].r, p.y - settled[i - 1].y) > 1e-6)
}

/**
 * The whole closed profile, counter-clockwise: out along the bottom, up the
 * outer skin, in across the top, and back down the cavity. Cups close on the
 * axis; a bottom-loaded sleeve is a loop around its bottom opening.
 */
export function shellProfile(config: DesignConfig): ShellPoint[] {
  const l = shellLayout(config)
  const outer = outerCorners(l)
  const rimInner = l.method === 'top' ? l.cavityRadius : l.holeRadius
  const sp = l.spigot
  // Seat → up the spigot (with the snap bead sampled finely) → across its top
  const bead: Corner[] = []
  if (sp.snap) for (let y = sp.bottomY + 0.3; y < sp.topY - 0.2; y += 0.3) bead.push({ r: sp.outer, y, round: 0, side: 'fit' })
  const top: Corner[] = [
    { r: sp.outer, y: sp.bottomY, round: 0.3, side: 'fit' },
    ...bead,
    { r: sp.outer, y: sp.topY, round: RIM_EDGE, side: 'fit' },
    { r: rimInner, y: sp.topY, round: RIM_EDGE, side: 'inner' },
  ]
  const s0 = shoulderStart(config.bottle)

  let corners: Corner[]
  if (l.method === 'top') {
    corners = [
      { r: 0, y: l.bottomY, round: 0, side: 'outer' },
      ...outer,
      ...top,
      { r: l.cavityRadius, y: 0, round: 0, side: 'inner' },
      { r: 0, y: 0, round: 0, side: 'inner' },
    ]
  } else if (l.method === 'halves') {
    corners = [
      { r: 0, y: l.bottomY, round: 0, side: 'outer' },
      ...outer,
      ...top,
      ...wrapCavity(l, s0),
      { r: l.cavityRadius, y: 0, round: 0, side: 'inner' },
      { r: 0, y: 0, round: 0, side: 'inner' },
    ]
  } else {
    const f = l.baseFit!
    corners = [
      { r: f.radius, y: l.bottomY, round: 0, side: 'thread' },
      ...outer,
      ...top,
      ...wrapCavity(l, s0),
      { r: l.cavityRadius, y: 0, round: 0, side: 'inner' },
      ...threadZone(f),
    ]
  }
  return settleOuter(l, roundCorners(corners))
}

/** 0 … 1 … 0 trapezoid along one pitch: the thread's tooth shape. */
function tooth(phase: number): number {
  const u = phase - Math.floor(phase)
  if (u < 0.3) return u / 0.3
  if (u < 0.5) return 1
  if (u < 0.8) return 1 - (u - 0.5) / 0.3
  return 0
}

/** Rounded bead, 2.8 mm tall, centred at `mid`: the shape of every snap fit. */
function bead(mid: number, y: number): number {
  const u = (y - mid) / 1.4
  return Math.abs(u) >= 1 ? 0 : Math.cos((u * Math.PI) / 2) ** 2
}

/**
 * How far the groove (in the shell) or the ridge (on the base cap) reaches
 * out at height y and angle a. Both parts use the same shape, so the cap's
 * ridges sit in the shell's grooves.
 */
export function baseFitOffset(f: BaseFit, y: number, a: number): number {
  if (f.kind === 'snap') return f.depth * bead((f.bottomY + f.topY) / 2, y)
  return f.depth * tooth((y - f.bottomY) / f.pitch - a / (Math.PI * 2))
}

/**
 * Snap bead on the spigot at height y (0 for friction and magnets). The cap's
 * socket uses the same shape, so its groove meets the bead.
 */
export function capFitOffset(sp: Spigot, y: number): number {
  return sp.snap ? sp.depth * bead((sp.bottomY + sp.topY) / 2, y) : 0
}

/** Depth (Z) radius of a point at radius r and height y after the squash. */
export function depthRadius(l: ShellLayout, r: number, y: number): number {
  const firm = cavityEdge(l, y) + l.minWall
  const squashed = r <= firm ? r : firm + (r - firm) * l.depthFactor
  return Math.max(squashed, Math.min(r, seatRadius(l, y)))
}

/** Segments per turn: a multiple of the prism's sides, so every corner is sampled. */
const roundSegments = (l: ShellLayout, segments: number) =>
  l.sides ? Math.ceil(segments / l.sides) * l.sides : segments

/** Turns a profile point into its position at angle a. */
export function shellPlacement(config: DesignConfig) {
  const l = shellLayout(config)
  const sides = l.sides
  const sector = sides ? (Math.PI * 2) / sides : 0
  const ribHalf = l.ribs ? RIB_WIDTH / 2 / l.cavityRadius : 0
  const ribHeight = config.assembly.clearance + 0.05

  return (p: ShellPoint, a: number): [number, number] => {
    let r = p.r
    if (p.side === 'thread') {
      r += baseFitOffset(l.baseFit!, p.y, a)
    } else if (p.side === 'fit') {
      r += capFitOffset(l.spigot, p.y)
    } else if (p.side === 'inner' && l.ribs && r <= l.cavityRadius + 1e-6 && p.y < l.topY - 1) {
      // Friction ribs: narrow raised strips that just touch the glass
      const pitch = (Math.PI * 2) / l.ribs
      const dist = Math.abs(((((a + pitch / 2) % pitch) + pitch) % pitch) - pitch / 2)
      if (dist < ribHalf) r -= ribHeight * Math.cos(((dist / ribHalf) * Math.PI) / 2) ** 2
    } else if (p.side === 'outer' && sides) {
      // Polygon with its flats at radius r; points near the cavity stay round
      const turn = l.twist * ((p.y - l.bottomY) / l.height)
      const rel = ((((a - turn) % sector) + sector) % sector) - sector / 2
      const k = clamp((r - cavityEdge(l, p.y)) / l.minWall, 0, 1)
      r *= 1 + k * (1 / Math.cos(rel) - 1)
      return [Math.cos(a) * r, Math.sin(a) * r]
    } else if (p.side === 'outer') {
      return [Math.cos(a) * r, Math.sin(a) * depthRadius(l, r, p.y)]
    }
    return [Math.cos(a) * r, Math.sin(a) * r]
  }
}

/** Outer radius of the shell where it meets the cap (before the rim rounding). */
export function shellTopRadius(l: ShellLayout): number {
  const curved = l.silhouette === 'teardrop' || l.silhouette === 'pebble'
  return Math.max(curved ? l.topRadius : l.shoulderRadius, firmRadius(l, l.topY))
}

/** Sweep the profile around Y into a closed, watertight solid with outward-facing triangles. */
export function buildShellMesh(config: DesignConfig, segments = 96): MeshData {
  const l = shellLayout(config)
  // Turning each ring with the twist keeps the polygon corners on vertices
  const angleAt = (p: ShellPoint) => (p.side === 'outer' ? l.twist * ((p.y - l.bottomY) / l.height) : 0)
  return revolve(shellProfile(config), roundSegments(l, segments), shellPlacement(config), angleAt)
}

/** The plug that closes a bottom-loaded shell, with the matching thread or snap bead. */
export function buildBaseCapMesh(config: DesignConfig, segments = 96): MeshData | null {
  const f = shellLayout(config).baseFit
  if (!f) return null
  const r = f.radius - f.clearance
  const profile: ShellPoint[] = [{ r: 0, y: f.bottomY, side: 'inner' }]
  const step = f.pitch / 12
  for (let y = f.bottomY; y < f.topY - step / 2; y += step) profile.push({ r, y, side: 'thread' })
  profile.push({ r, y: f.topY, side: 'thread' }, { r: 0, y: f.topY, side: 'inner' })
  return revolve(profile, segments, (p, a) => {
    const rr = p.side === 'thread' ? p.r + baseFitOffset(f, p.y, a) : p.r
    return [Math.cos(a) * rr, Math.sin(a) * rr]
  })
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
    if (p.side !== 'outer' || p.y < l.bottomY + l.corner || p.y > l.topY - l.corner) continue
    const reach = l.sides ? p.r : depthRadius(l, p.r, p.y)
    minWall = Math.min(minWall, reach - cavityEdge(l, p.y))
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
