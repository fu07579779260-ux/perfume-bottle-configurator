import type { Manifold, ManifoldToplevel } from 'manifold-3d'
import type { DesignConfig } from '@/model/config'
import { fromManifold, toManifold } from './manifold-mesh'
import { mergeMeshes, meshBounds, translate, type MeshData } from './mesh'
import { buildCapMesh, capProfile } from './cap'
import { openingCutter } from './openings'
import { buildBaseCapMesh, buildShellMesh, shellLayout, shellProfile, shellTopRadius } from './shell'

// The printable parts of a shell, in place around the bottle (for the preview
// and for checks) and laid out on the print bed (for export).

export type PartId = 'shell' | 'base' | 'front' | 'back' | 'dowel' | 'cap'

export interface Part {
  id: PartId
  mesh: MeshData
}

export interface JointInfo {
  kind: 'dowels' | 'magnets' | 'none'
  count: number
  /** Dowel or magnet diameter */
  diameter: number
  /** Dowel length, or magnet height */
  length: number
  /** False when the wall is too thin for any pin or magnet: glue the halves instead */
  fits: boolean
}

/** Depth of each dowel hole or magnet pocket, per half */
const DOWEL_HOLE = 4
const DOWEL_SIZES = [3, 2]
/** Wall left around a hole or pocket on each side */
const HOLE_WALL = 0.8
const BED_GAP = 8

/** The parts as they sit around the bottle, without the boolean work (instant, for the preview). */
export function previewParts(config: DesignConfig, segments = 96): Part[] {
  const parts: Part[] = [{ id: 'shell', mesh: buildShellMesh(config, segments) }]
  const base = buildBaseCapMesh(config, segments)
  if (base) parts.push({ id: 'base', mesh: base })
  parts.push({ id: 'cap', mesh: buildCapMesh(config, segments) })
  return parts
}

/**
 * Magnets that hold the cap: one pair on each side, in the seat ring between
 * the spigot and the outside (placed front and back, so a two-part shell
 * keeps each pocket whole). Null when the cap isn't held by magnets.
 */
export function capMagnetPlan(config: DesignConfig): { spots: number[]; radius: number; depth: number; fits: boolean } | null {
  if (config.cap.fit !== 'magnet') return null
  const l = shellLayout(config)
  const capBase = capProfile(config).find((q) => q.side === 'outer')?.r ?? 0
  const inner = l.spigot.outer + 0.3
  const outer = Math.min(shellTopRadius(l), capBase)
  const d = config.assembly.magnetDiameter
  const fits = outer - inner >= d + 2 * HOLE_WALL
  const mid = (inner + outer) / 2
  return { spots: fits ? [mid, -mid] : [], radius: d / 2 + 0.15, depth: config.assembly.magnetHeight + 0.2, fits }
}

/** Cut the same tools out of several solids; deletes the inputs and the tools. */
function cutAll(solids: Manifold[], tools: Manifold[]): Manifold[] {
  return solids.map((solid) => {
    let current = solid
    for (const tool of tools) {
      const next = current.subtract(tool)
      current.delete()
      current = next
    }
    return current
  })
}

/** Side-wall thickness along the X axis (where the halves meet) at height y. */
function wallAt(config: DesignConfig, y: number): { inner: number; outer: number } {
  const l = shellLayout(config)
  const outer = shellProfile(config).filter((p) => p.side === 'outer' && p.r > 0)
  let r = 0
  for (let i = 1; i < outer.length; i++) {
    const a = outer[i - 1]
    const b = outer[i]
    if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) r = Math.max(r, a.r + ((b.r - a.r) * (y - a.y)) / (b.y - a.y))
  }
  return { inner: l.cavityAt(y), outer: r }
}

/** Where the joints go on the cut face: two heights, both sides of the cavity. */
function jointPlan(config: DesignConfig) {
  const l = shellLayout(config)
  const magnets = config.assembly.halfJoint === 'magnets'
  const sizes = magnets ? [config.assembly.magnetDiameter] : DOWEL_SIZES
  const lo = 3
  const hi = Math.min(l.topY, config.bottle.bodyHeight) - 3

  for (const size of sizes) {
    const need = size + 2 * HOLE_WALL
    const ys: number[] = []
    for (const target of [0.25, 0.72]) {
      const y0 = lo + (hi - lo) * target
      // Nearest height around the target where the wall is thick enough
      for (let d = 0; d <= hi - lo; d += 1) {
        const y = [y0 - d, y0 + d].find((v) => v >= lo && v <= hi && wallAt(config, v).outer - wallAt(config, v).inner >= need)
        if (y !== undefined) {
          if (!ys.some((v) => Math.abs(v - y) < size + 4)) ys.push(y)
          break
        }
      }
    }
    if (ys.length) {
      const spots = ys.flatMap((y) => {
        const w = wallAt(config, y)
        const x = (w.inner + w.outer) / 2
        return [[x, y], [-x, y]] as const
      })
      return { size, spots, magnets }
    }
  }
  return { size: 0, spots: [] as (readonly [number, number])[], magnets }
}

/** Joint hardware for the UI: what to print or buy to close the halves. */
export function jointInfo(config: DesignConfig): JointInfo {
  if (config.assembly.method !== 'halves') return { kind: 'none', count: 0, diameter: 0, length: 0, fits: true }
  const plan = jointPlan(config)
  const fits = plan.spots.length > 0
  if (plan.magnets) {
    return { kind: 'magnets', count: plan.spots.length * 2, diameter: config.assembly.magnetDiameter, length: config.assembly.magnetHeight, fits }
  }
  return { kind: 'dowels', count: plan.spots.length, diameter: plan.size, length: 2 * DOWEL_HOLE - 0.6, fits }
}

/**
 * Every printable part with its holes, pockets and slots, still in place
 * around the bottle. Needs the geometry kernel for the cuts.
 */
export function printParts(wasm: ManifoldToplevel, config: DesignConfig, segments = 192): Part[] {
  const l = shellLayout(config)
  const holeClear = config.manufacturing.technology === 'fdm' ? 0.15 : 0.1
  const parts: Part[] = []
  const done = (id: PartId, m: Manifold) => {
    parts.push({ id, mesh: fromManifold(m) })
    m.delete()
  }

  // Magnet pockets for the cap go through the seat into both the shell and the cap
  const capMagnets = capMagnetPlan(config)
  const capTools = (capMagnets?.spots ?? []).map((z) =>
    wasm.Manifold.cylinder(2 * capMagnets!.depth, capMagnets!.radius, capMagnets!.radius, 32, true)
      .rotate([90, 0, 0])
      .translate([0, l.topY, z]),
  )
  // Openwork and windows, then the cap's magnet pockets
  const openings = openingCutter(wasm, config)
  let shell = cutAll([toManifold(wasm, buildShellMesh(config, segments))], [...(openings ? [openings] : []), ...capTools])[0]
  openings?.delete()

  if (l.method === 'halves') {
    const [front, back] = shell.splitByPlane([0, 0, 1], 0)
    shell.delete()
    const plan = jointPlan(config)
    const tools = plan.spots.map(([x, y]) => {
      const radius = plan.magnets ? plan.size / 2 + 0.15 : plan.size / 2 + holeClear
      const depth = plan.magnets ? config.assembly.magnetHeight + 0.2 : DOWEL_HOLE
      return wasm.Manifold.cylinder(2 * depth, radius, radius, 32, true).translate([x, y, 0])
    })
    const [cutFront, cutBack] = cutAll([front, back], tools)
    tools.forEach((t) => t.delete())
    done('front', cutFront)
    done('back', cutBack)
    if (!plan.magnets) {
      for (const [x, y] of plan.spots) {
        const r = plan.size / 2
        done('dowel', wasm.Manifold.cylinder(2 * DOWEL_HOLE - 0.6, r, r, 24, true).translate([x, y, 0]))
      }
    }
  } else {
    done('shell', shell)
    shell = undefined as never
  }

  const base = buildBaseCapMesh(config, segments)
  if (base && l.baseFit) {
    if (l.baseFit.kind === 'thread') {
      // A coin slot underneath, to screw the base cap in and out
      const slot = wasm.Manifold.cube([16, 3, 1.4], true).translate([0, l.baseFit.bottomY, 0])
      done('base', cutAll([toManifold(wasm, base)], [slot])[0])
      slot.delete()
    } else {
      parts.push({ id: 'base', mesh: base })
    }
  }

  done('cap', cutAll([toManifold(wasm, buildCapMesh(config, segments))], capTools)[0])
  capTools.forEach((t) => t.delete())
  return parts
}

/** The shell with its openings cut (for the preview), or null when it has none. */
export function cutShell(wasm: ManifoldToplevel, config: DesignConfig, segments = 96): MeshData | null {
  const openings = openingCutter(wasm, config)
  if (!openings) return null
  const shell = cutAll([toManifold(wasm, buildShellMesh(config, segments))], [openings])[0]
  openings.delete()
  const mesh = fromManifold(shell)
  shell.delete()
  return mesh
}

/** Rotate about X by a multiple of 90° (exact, keeps the winding). */
function rotateX(mesh: MeshData, quarterTurns: number): MeshData {
  const q = ((quarterTurns % 4) + 4) % 4
  const p = mesh.positions.slice()
  for (let i = 0; i < p.length; i += 3) {
    const y = p[i + 1]
    const z = p[i + 2]
    if (q === 1) [p[i + 1], p[i + 2]] = [-z, y]
    else if (q === 2) [p[i + 1], p[i + 2]] = [-y, -z]
    else if (q === 3) [p[i + 1], p[i + 2]] = [z, -y]
  }
  return { positions: p, indices: mesh.indices }
}

/** How each part lies on the bed (quarter turns about X; scene Y is up). */
const PRINT_TURN: Record<PartId, number> = {
  shell: 0,
  // Slot up, so the flat top of the plug sits on the bed
  base: 2,
  // Each half lies on its flat cut face
  front: 3,
  back: 1,
  // Stand the pins upright
  dowel: 3,
  // Upright on its flat underside; the 45° roofs inside need no supports
  cap: 0,
}

/** All parts in one mesh, each turned into its print orientation and spaced out on the bed. */
export function layoutForPrint(parts: Part[]): MeshData {
  const placed = parts.map((part) => {
    const turned = rotateX(part.mesh, PRINT_TURN[part.id])
    const b = meshBounds(turned)
    return { mesh: turned, b }
  })
  const total = placed.reduce((w, { b }) => w + b.width, 0) + BED_GAP * (placed.length - 1)
  let x = -total / 2
  return mergeMeshes(
    placed.map(({ mesh, b }) => {
      const moved = translate(mesh, x - b.min[0], -b.min[1], -(b.min[2] + b.max[2]) / 2)
      x += b.width + BED_GAP
      return moved
    }),
  )
}
