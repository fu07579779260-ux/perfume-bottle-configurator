import type { DesignConfig } from '@/model/config'
import { TECHNOLOGY_DEFAULTS } from '@/model/options'
import { revolve, type MeshData } from './mesh'

// The printed shell as a closed side profile swept around the Y axis.
// Y = 0 is the base of the glass bottle (= the top of the shell floor).
// This first version covers the Column silhouette, loaded from the top:
// a cup whose cavity is the glass bottle plus the fit clearance.

export interface ShellPoint {
  r: number
  y: number
  /** Outer skin (shaped, may be squashed in depth) or cavity side (always round) */
  side: 'outer' | 'inner'
}

export interface ShellLayout {
  /** Floor thickness under the bottle */
  floor: number
  bottomY: number
  topY: number
  shoulderY: number
  baseRadius: number
  shoulderRadius: number
  /** Cavity radius: glass radius + clearance */
  cavityRadius: number
  corner: number
  /**
   * Depth squash of the wall: in depth, a point at radius r sits at
   * cavity + (r − cavity) · depthFactor, so the cavity stays round while the
   * widest section reaches the chosen depth / width ratio.
   */
  depthFactor: number
}

/** Small rounding where the rim meets the cavity, so the edge isn't sharp. */
const RIM_EDGE = 0.4

export function shellLayout(config: DesignConfig): ShellLayout {
  const { bottle, shape, assembly, manufacturing } = config
  const tech = TECHNOLOGY_DEFAULTS[manufacturing.technology]
  const floor = Math.max(tech.minWall, 2)
  const cavityRadius = bottle.bodyDiameter / 2 + assembly.clearance
  const baseRadius = (bottle.bodyDiameter + shape.baseExtra) / 2
  const shoulderRadius = (bottle.bodyDiameter + shape.shoulderExtra) / 2
  const height = bottle.bodyHeight + shape.heightExtra
  const bottomY = -floor
  const topY = bottomY + height
  const shoulderY = bottomY + (height * shape.shoulderHeight) / 100

  // The rounding can't eat the whole rim or more than a quarter of the height
  const rim = Math.min(baseRadius, shoulderRadius) - cavityRadius
  const corner = Math.max(0, Math.min(shape.cornerRadius, rim - RIM_EDGE - 0.2, height / 4))

  const widest = Math.max(baseRadius, shoulderRadius)
  const depthFactor = Math.min(1, Math.max(0, (shape.sectionRatio * widest - cavityRadius) / (widest - cavityRadius)))

  return { floor, bottomY, topY, shoulderY, baseRadius, shoulderRadius, cavityRadius, corner, depthFactor }
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

/**
 * The whole closed profile: from the axis under the base, out and up the
 * outer skin, across the rim, down the cavity, and across the floor back to
 * the axis.
 */
export function shellProfile(config: DesignConfig): ShellPoint[] {
  const l = shellLayout(config)
  return roundCorners([
    { r: 0, y: l.bottomY, round: 0, side: 'outer' },
    { r: l.baseRadius, y: l.bottomY, round: l.corner, side: 'outer' },
    { r: l.shoulderRadius, y: l.shoulderY, round: l.corner, side: 'outer' },
    { r: l.shoulderRadius, y: l.topY, round: l.corner, side: 'outer' },
    { r: l.cavityRadius, y: l.topY, round: RIM_EDGE, side: 'inner' },
    { r: l.cavityRadius, y: 0, round: 0, side: 'inner' },
    { r: 0, y: 0, round: 0, side: 'inner' },
  ])
}

export interface WallCheck {
  /** Thinnest side wall around the bottle (in the squashed depth direction) */
  minWall: number
  floor: number
  /** Technology minimum */
  required: number
  ok: boolean
}

export function checkWall(config: DesignConfig): WallCheck {
  const l = shellLayout(config)
  const required = TECHNOLOGY_DEFAULTS[config.manufacturing.technology].minWall
  let minWall = Infinity
  for (const p of shellProfile(config)) {
    // Side wall beside the bottle, below the rounded rim
    if (p.side !== 'outer' || p.y < 0 || p.y > l.topY - l.corner) continue
    minWall = Math.min(minWall, (p.r - l.cavityRadius) * l.depthFactor)
  }
  minWall = Number(minWall.toFixed(3))
  return { minWall, floor: l.floor, required, ok: minWall >= required - 1e-6 && l.floor >= required }
}

export interface ShellSize {
  width: number
  depth: number
  height: number
}

export function shellSize(config: DesignConfig): ShellSize {
  const l = shellLayout(config)
  const widest = Math.max(l.baseRadius, l.shoulderRadius)
  return {
    width: 2 * widest,
    depth: 2 * (l.cavityRadius + (widest - l.cavityRadius) * l.depthFactor),
    height: l.topY - l.bottomY,
  }
}

/** Sweep the profile around Y into a closed, watertight cup with outward-facing triangles. */
export function buildShellMesh(config: DesignConfig, segments = 96): MeshData {
  const l = shellLayout(config)
  const depthAt = (r: number) => (r <= l.cavityRadius ? r : l.cavityRadius + (r - l.cavityRadius) * l.depthFactor)
  return revolve(shellProfile(config), segments, depthAt)
}
