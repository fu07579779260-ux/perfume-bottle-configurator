import type { DesignConfig } from '@/model/config'
import { ALLOWED_TEXTURES, PRINTER_BEDS, TECHNOLOGY_DEFAULTS } from '@/model/options'
import { capLayout } from './cap'
import { meshBounds } from './mesh'
import { shellOpenings } from './openings'
import { capMagnetPlan, jointInfo, previewParts, type PartId } from './parts'
import { checkOverhang, checkWall } from './shell'

// Every printability check in one place (PLAN.md §5): warnings point at
// something that may fail, notes explain something the app changed for you.
// They never block the export.

export type CheckId =
  | 'wallThin'
  | 'overhang'
  | 'partTooBig'
  | 'separateRuns'
  | 'capRaised'
  | 'capMagnets'
  | 'halvesGlue'
  | 'cellsSkipped'
  | 'noWindows'
  | 'strutThickened'
  | 'freeCombo'

export interface Check {
  id: CheckId
  level: 'warning' | 'note'
  values: Record<string, string>
}

const mm = (v: number) => v.toFixed(0)
/** Space between parts on the bed, as in the export layout */
const BED_GAP = 8

export interface PrintFootprint {
  id: PartId
  /** Size on the bed and height, in print orientation */
  x: number
  y: number
  z: number
}

/** Each part's footprint and height as it will lie on the bed. */
export function printFootprints(config: DesignConfig): PrintFootprint[] {
  const out: PrintFootprint[] = []
  for (const part of previewParts(config, 48)) {
    const b = meshBounds(part.mesh)
    if (part.id === 'shell' && config.assembly.method === 'halves') {
      // Two halves lying on their cut faces
      out.push({ id: 'front', x: b.width, y: b.height, z: b.depth / 2 }, { id: 'back', x: b.width, y: b.height, z: b.depth / 2 })
    } else {
      out.push({ id: part.id, x: b.width, y: b.depth, z: b.height })
    }
  }
  return out
}

/** Bed size of the chosen printer (X × Y × Z). */
export function printerBed(config: DesignConfig): [number, number, number] {
  const m = config.manufacturing
  return PRINTER_BEDS[`${m.technology}:${m.printer}`] ?? PRINTER_BEDS[`${m.technology}:generic`]
}

export function designChecks(config: DesignConfig): Check[] {
  const checks: Check[] = []
  const tech = TECHNOLOGY_DEFAULTS[config.manufacturing.technology]

  const wall = checkWall(config)
  if (!wall.ok) checks.push({ id: 'wallThin', level: 'warning', values: { wall: wall.minWall.toFixed(1), min: String(wall.required) } })

  const overhang = checkOverhang(config)
  if (!overhang.ok) checks.push({ id: 'overhang', level: 'warning', values: { angle: String(overhang.maxAngle), limit: String(overhang.limit) } })

  // Does every part fit the printer, and do they fit together?
  const [bx, by, bz] = printerBed(config)
  const parts = printFootprints(config)
  for (const p of parts) {
    const flat = (p.x <= bx && p.y <= by) || (p.y <= bx && p.x <= by)
    if (!flat || p.z > bz) {
      checks.push({ id: 'partTooBig', level: 'warning', values: { part: p.id, size: `${mm(p.x)} × ${mm(p.y)} × ${mm(p.z)}`, bed: `${bx} × ${by} × ${bz}` } })
    }
  }
  const row = parts.reduce((w, p) => w + p.x, 0) + BED_GAP * (parts.length - 1)
  if (!checks.some((c) => c.id === 'partTooBig') && row > bx && row > by) {
    checks.push({ id: 'separateRuns', level: 'note', values: { row: mm(row), bed: `${bx} × ${by}` } })
  }

  const cap = capLayout(config)
  if (cap.raised) checks.push({ id: 'capRaised', level: 'note', values: { height: (cap.topY - cap.baseY).toFixed(1) } })
  const magnets = capMagnetPlan(config)
  if (magnets && !magnets.fits) checks.push({ id: 'capMagnets', level: 'warning', values: {} })
  if (config.assembly.method === 'halves' && !jointInfo(config).fits) checks.push({ id: 'halvesGlue', level: 'warning', values: {} })

  const openings = shellOpenings(config)
  if (openings.skipped > 0) checks.push({ id: 'cellsSkipped', level: 'note', values: { n: String(openings.skipped) } })
  if (config.texture.windowCount > 0 && !openings.windows.length && config.shape.silhouette !== 'exoskeleton') {
    checks.push({ id: 'noWindows', level: 'warning', values: {} })
  }
  if (config.shape.silhouette === 'exoskeleton' && config.shape.strutWidth < tech.minStrut) {
    checks.push({ id: 'strutThickened', level: 'note', values: { min: String(tech.minStrut) } })
  }
  const t = config.texture
  const used = t.zone === 'bands' ? [t.type, t.upperType] : [t.type]
  if (config.mode.advanced && used.some((x) => !ALLOWED_TEXTURES[config.shape.silhouette].includes(x))) {
    checks.push({ id: 'freeCombo', level: 'note', values: {} })
  }
  return checks
}
