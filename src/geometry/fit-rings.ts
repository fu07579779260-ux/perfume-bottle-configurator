import { RANGES, type DesignConfig } from '@/model/config'
import { TECHNOLOGY_DEFAULTS } from '@/model/options'
import { mergeMeshes, meshBounds, revolve, translate, type MeshData } from './mesh'

// Fit test rings: short tubes printed in a few minutes to find the clearance
// before printing a whole shell. One row slides over the glass body, one over
// the pump collar (for the cap). Each row is a ladder of clearances around
// the current value; ring 1 (lowest) is the shortest and every next ring is
// 1 mm taller, so they can be told apart without labels.

export const LADDER_SIZE = 5
export const LADDER_STEP = 0.05
const BASE_HEIGHT = 6
/** Small chamfer inside the bottom edge against the squashed first layer ("elephant foot"). */
const FOOT_CHAMFER = 0.5
/** Small chamfer inside the top edge so the glass slides in more easily. */
const LEAD_CHAMFER = 0.3
const GAP = 6

const round2 = (v: number) => Number(v.toFixed(2))

/** Five clearances in 0.05 mm steps around `center`, kept inside 0.2–0.6 mm. */
export function clearanceLadder(center: number): number[] {
  const { min, max } = RANGES.assembly.clearance
  const span = (LADDER_SIZE - 1) * LADDER_STEP
  const start = Math.min(max - span, Math.max(min, center - span / 2))
  return Array.from({ length: LADDER_SIZE }, (_, k) => round2(start + k * LADDER_STEP))
}

export interface FitRing {
  /** 1-based, from the smallest clearance */
  index: number
  clearance: number
  height: number
  innerDiameter: number
  outerDiameter: number
}

function ringMesh(ring: FitRing, segments: number): MeshData {
  const ri = ring.innerDiameter / 2
  const ro = ring.outerDiameter / 2
  const h = ring.height
  return revolve(
    [
      { r: ri + FOOT_CHAMFER, y: 0 },
      { r: ro, y: 0 },
      { r: ro, y: h },
      { r: ri + LEAD_CHAMFER, y: h },
      { r: ri, y: h - LEAD_CHAMFER },
      { r: ri, y: FOOT_CHAMFER },
    ],
    segments,
  )
}

function ladder(diameter: number, center: number, wall: number): FitRing[] {
  return clearanceLadder(center).map((clearance, k) => {
    const innerDiameter = round2(diameter + 2 * clearance)
    return {
      index: k + 1,
      clearance,
      height: BASE_HEIGHT + k,
      innerDiameter,
      outerDiameter: round2(innerDiameter + 2 * wall),
    }
  })
}

export interface FitTest {
  body: FitRing[]
  collar: FitRing[]
  mesh: MeshData
  /** Footprint on the print bed (mm) */
  bed: { width: number; depth: number }
}

export function fitTestRings(config: DesignConfig, segments = 128): FitTest {
  const tech = TECHNOLOGY_DEFAULTS[config.manufacturing.technology]
  const wall = Math.max(tech.minWall + 0.4, 2)
  const body = ladder(config.bottle.bodyDiameter, config.assembly.clearance, wall)
  const collar = ladder(config.bottle.collarDiameter, config.cap.clearance, wall)

  // Two rows, centred on the origin: body rings in front, collar rings behind
  const row = (rings: FitRing[], z: number) => {
    const total = rings.reduce((w, r) => w + r.outerDiameter, 0) + GAP * (rings.length - 1)
    let x = -total / 2
    return rings.map((r) => {
      const m = translate(ringMesh(r, segments), x + r.outerDiameter / 2, 0, z)
      x += r.outerDiameter + GAP
      return m
    })
  }
  const bodyOuter = body[body.length - 1].outerDiameter
  const collarOuter = collar[collar.length - 1].outerDiameter
  const mesh = mergeMeshes([...row(body, bodyOuter / 2), ...row(collar, -(collarOuter / 2 + GAP))])
  const b = meshBounds(mesh)

  return { body, collar, mesh, bed: { width: b.width, depth: b.depth } }
}
