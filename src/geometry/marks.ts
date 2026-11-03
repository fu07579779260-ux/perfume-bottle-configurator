import type { Manifold, ManifoldToplevel } from 'manifold-3d'
import type { DesignConfig } from '@/model/config'
import { capLayout, capProfile } from './cap'
import { shellLayout, shellPlacement, shellProfile, type ShellPoint } from './shell'
import type { Outline } from './trace'

// Personal marks (PLAN.md §4.6): text, a logo and the design number, as
// traced outlines in mm. Each one is extruded with the geometry kernel and
// bent onto its face: wrapped around the shell (front or back), flat into
// the base, or following the top of the cap. Raised marks are added, engraved
// ones are cut. The base and the design number are always engraved, so the
// bottle stands flat.

export interface Marks {
  text: Outline | null
  logo: Outline | null
  /** The design number, already set in type */
  number: Outline | null
}

export type Face = 'front' | 'back' | 'base' | 'capTop'

export interface MarkItem {
  outline: Outline
  face: Face
  mode: 'raised' | 'engraved'
  depth: number
}

/** Space between marks that share a face */
const STACK_GAP = 2
/** How far a raised mark sinks into the surface, and an engraving tool reaches out of it */
const OVERLAP = 1
/** Depth of the design number */
const NUMBER_DEPTH = 0.6
/** Longest edge after refining, so bent marks follow the curve smoothly */
const BEND_STEP = 0.7

/** The marks of a design, each with its face, mode and depth. */
export function markItems(config: DesignConfig, marks: Marks): MarkItem[] {
  const p = config.personal
  const items: MarkItem[] = []
  const mode = p.textMode
  if (marks.text?.length && p.text.trim()) {
    const face = p.textPosition
    items.push({ outline: marks.text, face, mode: face === 'base' ? 'engraved' : mode, depth: p.textDepth })
  }
  if (marks.logo?.length && p.logoName) items.push({ outline: marks.logo, face: p.logoPosition, mode, depth: p.textDepth })
  if (marks.number?.length && p.designNumber) items.push({ outline: marks.number, face: 'base', mode: 'engraved', depth: NUMBER_DEPTH })
  return items
}

function bounds(o: Outline) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const l of o) {
    for (const [x, y] of l) {
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  }
  return { minX, maxX, minY, maxY }
}

/** Stack the outlines of one face from the top down, centred on (0, dy). */
function stack(items: MarkItem[], dy = 0): { item: MarkItem; outline: Outline }[] {
  const heights = items.map((i) => {
    const b = bounds(i.outline)
    return b.maxY - b.minY
  })
  const total = heights.reduce((a, h) => a + h, 0) + STACK_GAP * (items.length - 1)
  let top = dy + total / 2
  return items.map((item, k) => {
    const b = bounds(item.outline)
    const shift = top - b.maxY
    top -= heights[k] + STACK_GAP
    return { item, outline: item.outline.map((l) => l.map(([x, y]) => [x, y + shift] as [number, number])) }
  })
}

const mirrorX = (o: Outline): Outline => o.map((l) => l.map(([x, y]) => [-x, y] as [number, number]).reverse())

/** Extrude an outline along +Z, from 0 to `height`. Caller deletes it. */
function extrudeOutline(wasm: ManifoldToplevel, outline: Outline, height: number): Manifold {
  const section = new wasm.CrossSection(outline, 'EvenOdd')
  const solid = section.extrude(height)
  section.delete()
  return solid
}

/** Outer skin radius of the shell at height y and angle a (texture and section included). */
function shellSurface(config: DesignConfig): (y: number, a: number) => number {
  const l = shellLayout(config)
  const place = shellPlacement(config)
  const outer = shellProfile(config).filter((p) => p.side === 'outer' && p.r > 0 && p.y > l.bottomY && p.y < l.topY)
  return (y, a) => {
    let r = outer[0]?.r ?? l.shoulderRadius
    for (let i = 1; i < outer.length; i++) {
      const p = outer[i - 1]
      const q = outer[i]
      if ((p.y - y) * (q.y - y) <= 0 && p.y !== q.y) {
        r = p.r + ((q.r - p.r) * (y - p.y)) / (q.y - p.y)
        break
      }
    }
    const [x, z] = place({ r, y, side: 'outer' } as ShellPoint, a)
    return Math.hypot(x, z)
  }
}

/** Height of the top of the cap at distance rho from the axis. */
function capSurface(config: DesignConfig): (rho: number) => number {
  const outer = capProfile(config).filter((p) => p.side === 'outer')
  // Walk down from the tip on the axis until the radius passes rho
  return (rho) => {
    for (let i = outer.length - 1; i > 0; i--) {
      const p = outer[i]
      const q = outer[i - 1]
      if (q.r >= rho && p.r <= rho) {
        const t = q.r === p.r ? 0 : (rho - p.r) / (q.r - p.r)
        return p.y + (q.y - p.y) * t
      }
      if (q.r < p.r) break
    }
    return outer[outer.length - 1].y
  }
}

/**
 * Add the raised marks of the chosen faces to a solid and cut the engraved
 * ones. Deletes `solid` and returns the result.
 */
export function applyMarks(
  wasm: ManifoldToplevel,
  config: DesignConfig,
  solid: Manifold,
  items: MarkItem[],
  faces: Face[],
): Manifold {
  let current = solid
  const combine = (tool: Manifold, mode: MarkItem['mode']) => {
    const next = mode === 'raised' ? current.add(tool) : current.subtract(tool)
    current.delete()
    tool.delete()
    current = next
  }
  const l = shellLayout(config)

  for (const face of faces) {
    const onFace = items.filter((i) => i.face === face)
    if (!onFace.length) continue

    if (face === 'front' || face === 'back') {
      const surface = shellSurface(config)
      const a0 = face === 'front' ? Math.PI / 2 : -Math.PI / 2
      const yc = (l.texture.from + l.texture.to) / 2
      const r0 = surface(yc, a0)
      for (const { item, outline } of stack(onFace)) {
        // Engrave no deeper than the wall allows
        const room = r0 - l.cavityAt(yc) - l.minWall
        const depth = item.mode === 'engraved' ? Math.min(item.depth, room) : item.depth
        if (depth < 0.2) continue
        const tool = extrudeOutline(wasm, outline, depth + OVERLAP).refineToLength(BEND_STEP)
        const bent = tool.warp((v) => {
          const a = a0 - v[0] / r0
          const y = yc + v[1]
          const radial = surface(y, a) + v[2] - (item.mode === 'raised' ? OVERLAP : depth)
          v[0] = Math.cos(a) * radial
          v[1] = y
          v[2] = Math.sin(a) * radial
        })
        tool.delete()
        combine(bent, item.mode)
      }
    } else if (face === 'base') {
      // Read from below: mirrored in X, "up" towards the front
      const f = l.baseFit
      const slotted = f?.kind === 'thread'
      const bottom = l.bottomY
      const floor = f ? f.topY - f.bottomY - 2 : l.floor - l.minWall
      // Keep clear of the coin slot across the middle of a screw-in base cap
      const placed = stack(onFace)
      const height = placed.length ? bounds(placed[0].outline).maxY - bounds(placed[placed.length - 1].outline).minY : 0
      for (const { item, outline } of stack(onFace, slotted ? -(1.5 + 1.5 + height / 2) : 0)) {
        const depth = Math.min(item.depth, Math.max(0, floor))
        if (depth < 0.2) continue
        const tool = extrudeOutline(wasm, mirrorX(outline), depth + OVERLAP)
        const placedTool = tool.warp((v) => {
          const [x, y, z] = v
          v[0] = -x
          v[1] = bottom - OVERLAP + z
          v[2] = y
        })
        tool.delete()
        combine(placedTool, 'engraved')
      }
    } else {
      // Cap top: follows the curve of the top, read from the front
      const cap = capLayout(config)
      const surface = capSurface(config)
      const room = cap.topY - cap.apex - l.minWall
      for (const { item, outline } of stack(onFace)) {
        const depth = item.mode === 'engraved' ? Math.min(item.depth, room) : item.depth
        if (depth < 0.2) continue
        const tool = extrudeOutline(wasm, outline, depth + OVERLAP).refineToLength(BEND_STEP)
        const bent = tool.warp((v) => {
          const [x, y, z] = v
          const top = surface(Math.hypot(x, y))
          v[0] = x
          v[1] = top + z - (item.mode === 'raised' ? OVERLAP : depth)
          v[2] = -y
        })
        tool.delete()
        combine(bent, item.mode)
      }
    }
  }
  return current
}
