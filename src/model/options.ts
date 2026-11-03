// Enumerated choices from PLAN.md §4. Order is the display order.

// ---------- Glass inner bottle ----------

export const BOTTLE_PRESETS = ['10ml', '30ml', '50ml', 'custom'] as const
export type BottlePreset = (typeof BOTTLE_PRESETS)[number]

export const NECK_FINISHES = ['13-415', '15-415', '18-415', 'custom'] as const
export type NeckFinish = (typeof NECK_FINISHES)[number]

/**
 * Placeholder dimensions of the glass bottles (mm). Build step 4 replaces
 * them with measurements of the bottles we actually buy.
 */
export const BOTTLE_DIMENSIONS: Record<
  Exclude<BottlePreset, 'custom'>,
  {
    bodyDiameter: number
    bodyHeight: number
    shoulderRadius: number
    neckFinish: NeckFinish
    neckHeight: number
    collarDiameter: number
    pumpHeight: number
  }
> = {
  '10ml': { bodyDiameter: 20, bodyHeight: 60, shoulderRadius: 3, neckFinish: '13-415', neckHeight: 10, collarDiameter: 15, pumpHeight: 22 },
  '30ml': { bodyDiameter: 30, bodyHeight: 70, shoulderRadius: 3, neckFinish: '18-415', neckHeight: 10, collarDiameter: 20, pumpHeight: 22 },
  '50ml': { bodyDiameter: 36, bodyHeight: 85, shoulderRadius: 3, neckFinish: '18-415', neckHeight: 10, collarDiameter: 20, pumpHeight: 22 },
}

// ---------- Assembly ----------

export const ASSEMBLY_METHODS = ['bottom', 'top', 'halves'] as const
export type AssemblyMethod = (typeof ASSEMBLY_METHODS)[number]

export const BASE_FIXINGS = ['thread', 'snap'] as const
export type BaseFixing = (typeof BASE_FIXINGS)[number]

export const HALF_JOINTS = ['snaps', 'magnets'] as const
export type HalfJoint = (typeof HALF_JOINTS)[number]

// ---------- Silhouette ----------

// The six base silhouettes (PLAN.md §4.3)
export const SILHOUETTES = ['column', 'teardrop', 'prism', 'pebble', 'exoskeleton', 'coral'] as const
export type Silhouette = (typeof SILHOUETTES)[number]

/** Assembly method applied when the silhouette changes; the user can override it. */
export const RECOMMENDED_ASSEMBLY: Record<Silhouette, AssemblyMethod> = {
  column: 'top',
  teardrop: 'bottom',
  prism: 'top',
  pebble: 'bottom',
  exoskeleton: 'halves',
  coral: 'bottom',
}

// ---------- Texture ----------

export const TEXTURES = ['smooth', 'fluted', 'facets', 'waves', 'cellular'] as const
export type Texture = (typeof TEXTURES)[number]

/** Textures offered per silhouette outside the advanced mode (PLAN.md §4.4). */
export const ALLOWED_TEXTURES: Record<Silhouette, readonly Texture[]> = {
  column: TEXTURES,
  teardrop: TEXTURES,
  prism: ['smooth', 'fluted', 'waves'],
  pebble: ['smooth', 'facets', 'waves', 'cellular'],
  // These carry their own structure
  exoskeleton: ['smooth'],
  coral: ['smooth'],
}

export const WAVE_DIRECTIONS = ['horizontal', 'spiral'] as const
export type WaveDirection = (typeof WAVE_DIRECTIONS)[number]

export const TEXTURE_ZONES = ['whole', 'lower', 'bands'] as const
export type TextureZone = (typeof TEXTURE_ZONES)[number]

export const WINDOW_SHAPES = ['slot', 'arch', 'ellipse'] as const
export type WindowShape = (typeof WINDOW_SHAPES)[number]

// ---------- Cap ----------

export const CAP_FORMS = ['follow', 'cylinder', 'sphere', 'gem', 'sculptural'] as const
export type CapForm = (typeof CAP_FORMS)[number]

export const SCULPTURAL_STYLES = ['bud', 'coral', 'organic'] as const
export type SculpturalStyle = (typeof SCULPTURAL_STYLES)[number]

export const CAP_FITS = ['friction', 'snap', 'magnet'] as const
export type CapFit = (typeof CAP_FITS)[number]

// ---------- Personalisation ----------

export const TEXT_MODES = ['raised', 'engraved'] as const
export type TextMode = (typeof TEXT_MODES)[number]

export const TEXT_POSITIONS = ['front', 'back', 'base', 'capTop'] as const
export type TextPosition = (typeof TEXT_POSITIONS)[number]

export const LOGO_POSITIONS = ['front', 'back', 'capTop'] as const
export type LogoPosition = (typeof LOGO_POSITIONS)[number]

export const FINISHES = ['matte', 'silk', 'translucent', 'metallic'] as const
export type Finish = (typeof FINISHES)[number]

// ---------- Manufacturing ----------

export const TECHNOLOGIES = ['fdm', 'resin', 'sls'] as const
export type Technology = (typeof TECHNOLOGIES)[number]

export const MATERIALS: Record<Technology, readonly string[]> = {
  fdm: ['pla', 'petg'],
  resin: ['standard', 'tough'],
  sls: ['pa12'],
}

export const PRINTERS: Record<Technology, readonly string[]> = {
  fdm: ['generic', 'bambu-x1', 'bambu-p1s', 'bambu-a1', 'prusa-mk4'],
  resin: ['generic', 'elegoo', 'anycubic'],
  sls: ['generic'],
}

/** Values applied when the technology changes (PLAN.md §5); the user can override them afterwards. */
export const TECHNOLOGY_DEFAULTS: Record<
  Technology,
  { clearance: number; material: string; minWall: number; minHole: number; minStrut: number; maxOverhang: number | null }
> = {
  fdm: { clearance: 0.35, material: 'pla', minWall: 1.6, minHole: 2.0, minStrut: 2.0, maxOverhang: 45 },
  resin: { clearance: 0.25, material: 'standard', minWall: 1.0, minHole: 1.0, minStrut: 1.2, maxOverhang: null },
  sls: { clearance: 0.3, material: 'pa12', minWall: 1.2, minHole: 1.5, minStrut: 1.5, maxOverhang: null },
}

export const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value)
