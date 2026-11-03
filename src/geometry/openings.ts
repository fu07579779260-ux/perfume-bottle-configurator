import type { Manifold, ManifoldToplevel } from 'manifold-3d'
import type { DesignConfig } from '@/model/config'
import { TECHNOLOGY_DEFAULTS } from '@/model/options'
import { shellLayout, type ShellLayout } from './shell'

// Openings through the shell wall (PLAN.md §4.4): cellular openwork (a
// Voronoi pattern of holes that lets the glass show through), viewing
// windows for the perfume level, the panels between the struts of the
// Exoskeleton Frame, and the pores of the Coral. Both are worked out flat, on the shell's
// surface unrolled around its circumference (u = arc length, y = height),
// and every hole becomes a convex cutter that reaches through the wall.

/** A convex hole in unrolled coordinates (u in mm along the circumference, y in mm). */
export type Hole = [u: number, y: number][]

export interface Openings {
  /** Radius used to unroll the surface (u = angle · radius) */
  radius: number
  /** Openwork cells: they never touch each other */
  cells: Hole[]
  windows: Hole[]
  /** Holes left out because they'd be smaller than the technology can print */
  skipped: number
}

/** Small deterministic random generator, so a seed always gives the same pattern. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Keep the part of a convex polygon where n · p ≤ c (Sutherland–Hodgman). */
function clip(poly: Hole, nx: number, ny: number, c: number): Hole {
  const out: Hole = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const da = nx * a[0] + ny * a[1] - c
    const db = nx * b[0] + ny * b[1] - c
    if (da <= 0) out.push(a)
    if (da * db < 0) {
      const t = da / (da - db)
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  }
  return out
}

function area(poly: Hole): number {
  let s = 0
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % poly.length]
    s += x1 * y2 - x2 * y1
  }
  return Math.abs(s) / 2
}

/** Cellular openwork: Voronoi cells around jittered seeds, shrunk by half the rim on every side. */
function cellularHoles(config: DesignConfig, l: ShellLayout, minHole: number): { holes: Hole[]; skipped: number } {
  const { cellSize, cellRim } = config.texture
  const radius = l.texture.radius
  const circumference = Math.PI * 2 * radius
  // Keep a solid band at the top and bottom of the pattern
  const from = l.texture.from + cellRim
  const to = l.texture.to - cellRim
  const cols = Math.max(3, Math.round(circumference / cellSize))
  const rows = Math.max(1, Math.floor((to - from) / cellSize))
  if (to - from < cellSize * 0.6) return { holes: [], skipped: 0 }

  const su = circumference / cols
  const sy = (to - from) / rows
  const rand = mulberry32(config.shape.growthSeed * 7919 + 17)
  const seeds: [number, number][] = []
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const offset = j % 2 ? su / 2 : 0
      seeds.push([(i + 0.5 + (rand() - 0.5) * 0.6) * su + offset, from + (j + 0.5 + (rand() - 0.5) * 0.6) * sy])
    }
  }
  // Copies one turn either side, so cells meet across the seam
  const all = seeds.flatMap(([u, y]) => [[u, y], [u - circumference, y], [u + circumference, y]] as [number, number][])

  const holes: Hole[] = []
  let skipped = 0
  const reach = 2.5 * Math.max(su, sy)
  for (const [su0, sy0] of seeds) {
    let poly: Hole = [
      [su0 - reach, sy0 - reach],
      [su0 + reach, sy0 - reach],
      [su0 + reach, sy0 + reach],
      [su0 - reach, sy0 + reach],
    ]
    for (const [tu, ty] of all) {
      const dx = tu - su0
      const dy = ty - sy0
      const d = Math.hypot(dx, dy)
      if (d < 1e-9 || d > 2 * reach) continue
      // Bisector moved half a rim towards this seed
      const nx = dx / d
      const ny = dy / d
      const mid = (nx * (su0 + tu) + ny * (sy0 + ty)) / 2
      poly = clip(poly, nx, ny, mid - cellRim / 2)
      if (poly.length < 3) break
    }
    poly = clip(clip(poly, 0, -1, -from), 0, 1, to)
    if (poly.length < 3) continue
    // Roughly the diameter of a circle with the same area
    if (2 * Math.sqrt(area(poly) / Math.PI) < minHole) {
      skipped++
      continue
    }
    holes.push(poly)
  }
  return { holes, skipped }
}

/** Most pores at full density: one per this many mm² of surface */
const PORE_AREA = 70
/** Solid left between two pores */
const PORE_RIM = 2

/**
 * Coral pores: round holes of mixed sizes scattered without touching (dart
 * throwing with the growth seed). Hole density 0 gives none.
 */
function coralPores(config: DesignConfig, l: ShellLayout, minHole: number): { holes: Hole[]; skipped: number } {
  const density = config.shape.holeDensity
  if (density <= 0) return { holes: [], skipped: 0 }
  const circumference = Math.PI * 2 * l.texture.radius
  const { from, to } = l.texture
  const target = Math.round((density * circumference * (to - from)) / PORE_AREA)
  const rand = mulberry32(config.shape.growthSeed * 104729 + 3)
  const smallest = Math.max(minHole / 2, 1.5)
  const placed: [number, number, number][] = []
  for (let tries = 0; tries < target * 30 && placed.length < target; tries++) {
    const r = smallest + rand() * Math.max(0.5, 4.5 - smallest)
    const u = rand() * circumference
    const y = from + r + PORE_RIM + rand() * Math.max(0, to - from - 2 * (r + PORE_RIM))
    if (y + r + PORE_RIM > to) continue
    // Distance across the seam too
    const clear = placed.every(([pu, py, pr]) => {
      const du = Math.min(Math.abs(u - pu), circumference - Math.abs(u - pu))
      return Math.hypot(du, y - py) >= r + pr + PORE_RIM
    })
    if (clear) placed.push([u, y, r])
  }
  const holes = placed.map(([u, y, r]) =>
    Array.from({ length: 12 }, (_, k) => {
      const a = (k / 12) * Math.PI * 2
      return [u + r * Math.cos(a), y + r * Math.sin(a)] as [number, number]
    }),
  )
  return { holes, skipped: 0 }
}

/** A rounded rectangle centred on (u, y), as a convex outline. */
function roundedRect(u: number, y: number, w: number, h: number): Hole {
  const r = Math.min(w, h) * 0.35
  const out: Hole = []
  const corners: [number, number, number][] = [
    [u + w / 2 - r, y - h / 2 + r, -Math.PI / 2],
    [u + w / 2 - r, y + h / 2 - r, 0],
    [u - w / 2 + r, y + h / 2 - r, Math.PI / 2],
    [u - w / 2 + r, y - h / 2 + r, Math.PI],
  ]
  for (const [cu, cy, start] of corners) {
    for (let k = 0; k <= 6; k++) {
      const a = start + (k / 6) * (Math.PI / 2)
      out.push([cu + r * Math.cos(a), cy + r * Math.sin(a)])
    }
  }
  return out
}

export interface FrameLayout {
  struts: number
  /** Width of each strut and band (at least the technology's minimum strut) */
  strut: number
  /** Heights of the horizontal bands around the middle */
  bands: number[]
  /** Bottom and top of the open part (above the base ring, below the top ring) */
  from: number
  to: number
}

/** Struts and bands of the Exoskeleton Frame, or null for the other silhouettes. */
export function frameLayout(config: DesignConfig, l = shellLayout(config)): FrameLayout | null {
  if (config.shape.silhouette !== 'exoskeleton') return null
  const strut = Math.max(config.shape.strutWidth, TECHNOLOGY_DEFAULTS[config.manufacturing.technology].minStrut)
  const ring = Math.max(strut, 4)
  const from = l.texture.from + ring
  const to = l.texture.to - ring
  const h = to - from
  const count = h > 70 ? 2 : h > 35 ? 1 : 0
  const bands = Array.from({ length: count }, (_, k) => from + (h * (k + 1)) / (count + 1))
  return { struts: config.shape.strutCount, strut, bands, from, to }
}

/** Panels between the struts and bands; a strut sits at the front and every 360°/n after it. */
function frameHoles(config: DesignConfig, l: ShellLayout, minHole: number): Hole[] {
  const f = frameLayout(config, l)
  if (!f || f.to - f.from < 4) return []
  const circumference = Math.PI * 2 * l.texture.radius
  const pitch = circumference / f.struts
  const w = pitch - f.strut
  const edges = [f.from, ...f.bands, f.to]
  const holes: Hole[] = []
  for (let row = 0; row < edges.length - 1; row++) {
    const lo = edges[row] + (row > 0 ? f.strut / 2 : 0)
    const hi = edges[row + 1] - (row < edges.length - 2 ? f.strut / 2 : 0)
    if (w < minHole || hi - lo < minHole) continue
    const front = (Math.PI / 2) * l.texture.radius
    for (let k = 0; k < f.struts; k++) holes.push(roundedRect(front + (k + 0.5) * pitch, (lo + hi) / 2, w, hi - lo))
  }
  return holes
}

/** Viewing windows, evenly around the shell, the first one facing the front (+Z). */
function windowHoles(config: DesignConfig, l: ShellLayout): Hole[] {
  const t = config.texture
  if (t.windowCount === 0) return []
  const radius = l.texture.radius
  const circumference = Math.PI * 2 * radius
  const band = l.texture.to - l.texture.from
  const height = Math.min(t.windowHeight, band - 4)
  const width = Math.min(t.windowWidth, circumference / t.windowCount - 4)
  if (height < 4 || width < 2) return []
  const cy = (l.texture.from + l.texture.to) / 2
  const half = width / 2
  const outline: [number, number][] = []
  const steps = 24
  if (t.windowShape === 'ellipse') {
    for (let k = 0; k < steps * 2; k++) {
      const a = (k / (steps * 2)) * Math.PI * 2
      outline.push([half * Math.cos(a), (height / 2) * Math.sin(a)])
    }
  } else {
    // Slot: rounded at both ends; arch: square bottom, round top
    const round = Math.min(half, height / 2)
    const bottom = -height / 2
    const top = height / 2
    if (t.windowShape === 'arch') {
      outline.push([-half, bottom], [half, bottom])
    } else {
      for (let k = 0; k <= steps; k++) {
        const a = Math.PI + (k / steps) * Math.PI
        outline.push([round * Math.cos(a) * (half / round), bottom + round + round * Math.sin(a)])
      }
    }
    for (let k = 0; k <= steps; k++) {
      const a = (k / steps) * Math.PI
      outline.push([round * Math.cos(a) * (half / round), top - round + round * Math.sin(a)])
    }
  }
  const front = (Math.PI / 2) * radius
  return Array.from({ length: t.windowCount }, (_, i) => {
    const u0 = front + (i * circumference) / t.windowCount
    return outline.map(([du, dy]) => [u0 + du, cy + dy] as [number, number])
  })
}

/** All openings of the shell, flat. */
export function shellOpenings(config: DesignConfig): Openings {
  const l = shellLayout(config)
  const minHole = TECHNOLOGY_DEFAULTS[config.manufacturing.technology].minHole
  const t = config.texture
  const cellular = t.type === 'cellular' || (t.zone === 'bands' && t.upperType === 'cellular')
  const cells = cellular ? cellularHoles(config, l, minHole) : { holes: [], skipped: 0 }
  // The frame is all openings already, so it gets no extra windows
  if (config.shape.silhouette === 'exoskeleton') {
    return { radius: l.texture.radius, cells: frameHoles(config, l, minHole), windows: [], skipped: 0 }
  }
  if (config.shape.silhouette === 'coral') {
    const pores = coralPores(config, l, minHole)
    return { radius: l.texture.radius, cells: pores.holes, windows: windowHoles(config, l), skipped: 0 }
  }
  return { radius: l.texture.radius, cells: cells.holes, windows: windowHoles(config, l), skipped: cells.skipped }
}

export function hasOpenings(config: DesignConfig): boolean {
  const o = shellOpenings(config)
  return o.cells.length + o.windows.length > 0
}

/**
 * Cutters for every opening, as one solid (caller deletes it), or null when
 * there are none. Each hole is wrapped back onto the cylinder and stretched
 * from well inside the cavity to beyond the outer skin.
 */
export function openingCutter(wasm: ManifoldToplevel, config: DesignConfig): Manifold | null {
  const l = shellLayout(config)
  const { radius, cells, windows } = shellOpenings(config)
  if (!cells.length && !windows.length) return null
  const inner = l.cavityRadius * 0.5
  const outer = Math.max(l.baseRadius, l.shoulderRadius) * 1.5 + 5
  const cutter = (hole: Hole) => {
    const points: [number, number, number][] = []
    for (const [u, y] of hole) {
      const a = u / radius
      points.push([Math.cos(a) * inner, y, Math.sin(a) * inner], [Math.cos(a) * outer, y, Math.sin(a) * outer])
    }
    return wasm.Manifold.hull(points)
  }
  // Cells never touch, so they can simply be put together; windows may cross them
  const parts = [...(cells.length ? [cells.map(cutter)] : []), ...windows.map((w) => [cutter(w)])]
  const groups = parts.map((list) => {
    const g = list.length > 1 ? wasm.Manifold.compose(list) : list[0]
    if (list.length > 1) list.forEach((c) => c.delete())
    return g
  })
  const all = groups.length > 1 ? wasm.Manifold.union(groups) : groups[0]
  if (groups.length > 1) groups.forEach((g) => g.delete())
  return all
}
