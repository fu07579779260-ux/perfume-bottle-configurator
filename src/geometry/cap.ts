import type { DesignConfig } from '@/model/config'
import type { CapForm, SculpturalStyle } from '@/model/options'
import { pumpLayout } from './bottle'
import { envelopeRadius } from './envelope'
import { revolve, type MeshData } from './mesh'
import {
  capFitOffset,
  depthRadius,
  roundCorners,
  shellLayout,
  shellTopRadius,
  type Corner,
  type ShellPoint,
} from './shell'

// The printed cap. It sits on the seat at the top of the shell, and a socket
// in its underside slides over the shell's spigot (friction, snap bead or
// magnets). Inside, it clears the exposed pump. The socket and the cavity
// end in 45° cones, so the cap prints upright without supports.

/** Gap above the spigot, so the cap rests on the seat and not on the spigot top */
const SOCKET_GAP = 0.3
/** Room around the pump inside the cap */
const PUMP_ROOM = 0.6
/** Facets of the gem cap */
const GEM_SIDES = 8

const LOBES: Record<SculpturalStyle, { count: number; amount: number; twist: number }> = {
  bud: { count: 5, amount: 0.08, twist: 0 },
  coral: { count: 6, amount: 0.16, twist: 1.2 },
  organic: { count: 3, amount: 0.1, twist: 0.6 },
}

export interface CapLayout {
  form: CapForm
  /** Y of the seat the cap rests on (the shell top) */
  baseY: number
  topY: number
  /** True when the cap had to grow taller than asked to clear the pump */
  raised: boolean
  /** Inside of the socket (spigot + clearance) */
  socketRadius: number
  socketTop: number
  /** Cavity around the exposed pump (0 when the pump stays below the socket) */
  cavityRadius: number
  /** Where the cavity's 45° roof starts, and its tip on the axis */
  coneStart: number
  apex: number
  /** Outer radius before shaping */
  radius: number
  minWall: number
}

export function capLayout(config: DesignConfig): CapLayout {
  const l = shellLayout(config)
  const { cap, bottle } = config
  const sp = l.spigot
  const pump = pumpLayout(bottle)
  const baseY = l.topY
  const socketRadius = sp.outer + cap.clearance
  const socketTop = sp.topY + SOCKET_GAP

  // Widest part of the pump that sticks out above the spigot
  let exposed = 0
  for (let y = sp.topY; y <= pump.top; y += 0.5) exposed = Math.max(exposed, envelopeRadius(bottle, y))
  const cavityRadius = exposed > 0 ? Math.min(exposed + PUMP_ROOM, socketRadius) : 0

  const chamferTop = socketTop + (socketRadius - cavityRadius)
  let coneStart = chamferTop
  if (cavityRadius > 0) {
    // At 1 mm above the push button the roof must still clear it
    coneStart = Math.max(chamferTop, pump.top + 1 - cavityRadius + pump.actuator.radius + PUMP_ROOM)
  }
  const apex = coneStart + cavityRadius
  const topThickness = Math.max(2, l.minWall * 1.25)
  const asked = baseY + cap.height
  const topY = Math.max(asked, apex + topThickness)

  const radius = cap.form === 'follow' ? shellTopRadius(l) : (cap.width / 100) * l.shoulderRadius

  return {
    form: cap.form,
    baseY,
    topY,
    raised: topY > asked + 1e-6,
    socketRadius,
    socketTop,
    cavityRadius,
    coneStart,
    apex,
    radius,
    minWall: l.minWall,
  }
}

/** Radius of the cap's inside at height y (0 above the apex). */
function innerRadius(c: CapLayout, y: number): number {
  if (y <= c.socketTop) return c.socketRadius
  const chamfer = c.socketRadius - (y - c.socketTop)
  if (y <= c.coneStart) return Math.max(chamfer, c.cavityRadius)
  return Math.max(0, c.cavityRadius - (y - c.coneStart))
}

/** Outer radius at t = 0 (seat) … 1 (top) for the curved forms; null for the cornered ones. */
function curve(config: DesignConfig, c: CapLayout, t: number): number | null {
  const R = c.radius
  const silhouette = config.shape.silhouette
  switch (c.form) {
    case 'follow':
      if (silhouette === 'teardrop') return R * (1 - t ** 1.8) ** 0.6
      if (silhouette === 'pebble') return R * Math.sqrt(Math.max(0, 1 - t ** 2.4))
      return null
    case 'sculptural': {
      const style = config.cap.sculpturalStyle
      if (style === 'bud') return R * (t < 0.4 ? 0.75 + 0.25 * Math.sin(((t / 0.4) * Math.PI) / 2) : Math.cos((((t - 0.4) / 0.6) * Math.PI) / 2) ** 0.8)
      if (style === 'coral') return R * 0.85 * (t < 0.8 ? 1 : Math.sqrt(Math.max(0, 1 - ((t - 0.8) / 0.2) ** 2)))
      return R * Math.sqrt(Math.max(0, 1 - t ** 2.2))
    }
    default:
      return null
  }
}

/** Outer corners from the seat edge up to the axis on top. */
function outerCorners(config: DesignConfig, c: CapLayout): Corner[] {
  const R = c.radius
  const h = c.topY - c.baseY
  const at = (r: number, y: number, round = 0): Corner => ({ r, y, round, side: 'outer' })

  if (c.form === 'sphere') {
    // A sphere (squashed to the height) cut flat where it meets the seat
    const rb = Math.min(R * 0.98, Math.max(R * 0.6, c.socketRadius + c.minWall))
    const phi0 = Math.asin(rb / R)
    const half = h / (1 + Math.cos(phi0))
    const yc = c.baseY + half * Math.cos(phi0)
    const out: Corner[] = []
    for (let i = 0; i <= 32; i++) {
      const phi = phi0 + ((Math.PI - phi0) * i) / 32
      out.push(at(R * Math.sin(phi), yc - half * Math.cos(phi)))
    }
    out[out.length - 1] = at(0, c.topY)
    return out
  }
  if (c.form === 'gem') return [at(R * 0.82, c.baseY), at(R, c.baseY + 0.28 * h), at(R * 0.55, c.topY), at(0, c.topY)]
  if (c.form === 'cylinder') return [at(R, c.baseY), at(R, c.topY, 2), at(0, c.topY)]

  const samples = 40
  const shaped = curve(config, c, 0)
  if (shaped === null) {
    // Follow a Column or Faceted Prism: straight up, rounded like the shell
    return [at(R, c.baseY), at(R, c.topY, Math.min(config.shape.cornerRadius, h / 3)), at(0, c.topY)]
  }
  const out: Corner[] = []
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    out.push(at(i === samples ? 0 : (curve(config, c, t) ?? 0), c.baseY + t * h))
  }
  return out
}

/**
 * The closed profile, counter-clockwise: from the cavity tip on the axis,
 * down the cavity and the socket, out along the underside, up the outside to
 * the top of the axis.
 */
export function capProfile(config: DesignConfig): ShellPoint[] {
  const c = capLayout(config)
  const l = shellLayout(config)
  const inner: Corner[] = [{ r: 0, y: c.apex, round: 0, side: 'inner' }]
  if (c.cavityRadius > 0) {
    inner.push({ r: c.cavityRadius, y: c.coneStart, round: 0, side: 'inner' })
    const chamferTop = c.socketTop + (c.socketRadius - c.cavityRadius)
    if (chamferTop < c.coneStart - 1e-6) inner.push({ r: c.cavityRadius, y: chamferTop, round: 0, side: 'inner' })
  }
  inner.push({ r: c.socketRadius, y: c.socketTop, round: 0, side: 'fit' })
  if (l.spigot.snap) {
    for (let y = c.socketTop - 0.3; y > c.baseY + 0.2; y -= 0.3) inner.push({ r: c.socketRadius, y, round: 0, side: 'fit' })
  }
  inner.push({ r: c.socketRadius, y: c.baseY, round: 0, side: 'fit' })

  const points = roundCorners([...inner, ...outerCorners(config, c)])

  // Keep the wall around the cavity: densify long outer pieces, then clamp
  const out: ShellPoint[] = []
  points.forEach((p, i) => {
    const prev = points[i - 1]
    if (prev && p.side === 'outer' && prev.side === 'outer' && p.r > 0) {
      const n = Math.ceil(Math.hypot(p.r - prev.r, p.y - prev.y) / 1.5)
      for (let k = 1; k < n; k++) {
        const t = k / n
        out.push({ r: prev.r + (p.r - prev.r) * t, y: prev.y + (p.y - prev.y) * t, side: 'outer' })
      }
    }
    out.push(p)
  })
  const settled = out.map((p) => {
    if (p.side !== 'outer' || p.r === 0) return p
    const inside = innerRadius(c, p.y)
    return inside > 0 || p.y <= c.apex ? { ...p, r: Math.max(p.r, inside + c.minWall) } : p
  })
  return settled.filter((p, i) => i === 0 || Math.hypot(p.r - settled[i - 1].r, p.y - settled[i - 1].y) > 1e-6)
}

/** The cap as a closed, watertight mesh, in place on top of the shell. */
export function buildCapMesh(config: DesignConfig, segments = 96): MeshData {
  const c = capLayout(config)
  const l = shellLayout(config)
  const form = c.form
  const lobes = form === 'sculptural' ? LOBES[config.cap.sculpturalStyle] : null
  const follow = form === 'follow'
  const sides = follow ? l.sides : form === 'gem' ? GEM_SIDES : null
  const sector = sides ? (Math.PI * 2) / sides : 0
  const twistAt = (y: number) => (follow && l.sides ? l.twist * ((y - l.bottomY) / l.height) : 0)

  // Keep the shell's depth / width at the top when following a squashed silhouette
  const squash = follow && !l.sides ? depthRadius(l, c.radius, l.topY) / c.radius : 1
  const firmAt = (y: number) => {
    const inside = innerRadius(c, y)
    return inside > 0 ? inside + c.minWall : 0
  }

  const place = (p: ShellPoint, a: number): [number, number] => {
    if (p.side === 'fit') {
      const r = p.r + capFitOffset(l.spigot, p.y)
      return [Math.cos(a) * r, Math.sin(a) * r]
    }
    if (p.side !== 'outer' || p.r === 0) return [Math.cos(a) * p.r, Math.sin(a) * p.r]
    let r = p.r
    const firm = firmAt(p.y)
    if (sides) {
      const rel = ((((a - twistAt(p.y)) % sector) + sector) % sector) - sector / 2
      r *= 1 / Math.cos(rel)
    }
    if (lobes) {
      const t = (p.y - c.baseY) / (c.topY - c.baseY)
      r = Math.max(firm, r * (1 + lobes.amount * Math.cos(lobes.count * (a - lobes.twist * t))))
    }
    const depth = squash < 1 && r > firm ? firm + (r - firm) * ((squash * c.radius - firm) / (c.radius - firm)) : r
    return [Math.cos(a) * r, Math.sin(a) * Math.max(Math.min(depth, r), Math.min(r, firm))]
  }
  const angleAt = (p: ShellPoint) => (p.side === 'outer' ? twistAt(p.y) : 0)
  const n = sides ? Math.ceil(segments / sides) * sides : segments
  return revolve(capProfile(config), n, place, angleAt)
}
