import {
  DEFAULT_CONFIG,
  MAX_TEXT_LINE_LENGTH,
  MAX_TEXT_LINES,
  PROFILE_POINTS_MAX,
  PROFILE_POINTS_MIN,
  RANGES,
  type DesignConfig,
  type NumberRange,
  type ProfilePoint,
  type Section,
} from './config'
import {
  ASSEMBLY_METHODS,
  BASE_FIXINGS,
  BOTTLE_DIMENSIONS,
  BOTTLE_PRESETS,
  CAP_FITS,
  CAP_FORMS,
  FINISHES,
  HALF_JOINTS,
  isOneOf,
  LOGO_POSITIONS,
  MATERIALS,
  NECK_FINISHES,
  PRINTERS,
  SCULPTURAL_STYLES,
  SILHOUETTES,
  TECHNOLOGIES,
  TECHNOLOGY_DEFAULTS,
  TEXT_MODES,
  TEXT_POSITIONS,
  TEXTURE_ZONES,
  TEXTURES,
  WAVE_DIRECTIONS,
  WINDOW_SHAPES,
} from './options'

/** Clamp to the range and snap to its step (measured from min). */
export function clampToRange(value: number, r: NumberRange): number {
  const clamped = Math.min(r.max, Math.max(r.min, value))
  const snapped = r.min + Math.round((clamped - r.min) / r.step) * r.step
  // Remove float noise such as 1.2000000000000002
  return Math.min(r.max, Number(snapped.toFixed(6)))
}

const ENUMS: Partial<Record<string, readonly string[]>> = {
  'bottle.preset': BOTTLE_PRESETS,
  'bottle.neckFinish': NECK_FINISHES,
  'assembly.method': ASSEMBLY_METHODS,
  'assembly.baseFixing': BASE_FIXINGS,
  'assembly.halfJoint': HALF_JOINTS,
  'shape.silhouette': SILHOUETTES,
  'texture.type': TEXTURES,
  'texture.waveDirection': WAVE_DIRECTIONS,
  'texture.zone': TEXTURE_ZONES,
  'texture.upperType': TEXTURES,
  'texture.windowShape': WINDOW_SHAPES,
  'cap.form': CAP_FORMS,
  'cap.sculpturalStyle': SCULPTURAL_STYLES,
  'cap.fit': CAP_FITS,
  'personal.textMode': TEXT_MODES,
  'personal.textPosition': TEXT_POSITIONS,
  'personal.logoPosition': LOGO_POSITIONS,
  'personal.finish': FINISHES,
  'manufacturing.technology': TECHNOLOGIES,
}

const HEX_COLOUR = /^#[0-9a-f]{6}$/i
const COLOUR_FIELDS = ['personal.shellColour', 'personal.capColour', 'personal.liquidColour']

/** Cut by characters (code points), not UTF-16 units, so emoji and CJK aren't split. */
const truncate = (s: string, max: number) => Array.from(s).slice(0, max).join('')

/** At most MAX_TEXT_LINES lines of MAX_TEXT_LINE_LENGTH characters. */
export function sanitizeText(input: string): string {
  return input
    .replace(/\r/g, '')
    .split('\n')
    .slice(0, MAX_TEXT_LINES)
    .map((line) => truncate(line, MAX_TEXT_LINE_LENGTH))
    .join('\n')
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const unit = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v) ? Number(Math.min(1, Math.max(0, v)).toFixed(3)) : null

/** A valid list of profile points sorted from the base up, or null. */
export function sanitizeProfilePoints(input: unknown): ProfilePoint[] | null {
  if (!Array.isArray(input) || input.length < PROFILE_POINTS_MIN || input.length > PROFILE_POINTS_MAX) return null
  const points: ProfilePoint[] = []
  for (const p of input) {
    if (!Array.isArray(p) || p.length !== 2) return null
    const t = unit(p[0])
    const w = unit(p[1])
    if (t === null || w === null) return null
    points.push([t, w])
  }
  return points.sort((a, b) => a[0] - b[0])
}

function sanitizeField(section: Section, key: string, input: unknown, fallback: unknown): unknown {
  const path = `${section}.${key}`
  const range = (RANGES[section] as Record<string, NumberRange | undefined>)[key]

  if (range) return typeof input === 'number' && Number.isFinite(input) ? clampToRange(input, range) : fallback
  const options = ENUMS[path]
  if (options) return isOneOf(options, input) ? input : fallback
  if (typeof fallback === 'boolean') return typeof input === 'boolean' ? input : fallback
  if (COLOUR_FIELDS.includes(path)) {
    return typeof input === 'string' && HEX_COLOUR.test(input) ? input.toLowerCase() : fallback
  }

  switch (path) {
    case 'shape.profilePoints':
      return sanitizeProfilePoints(input)
    case 'personal.text':
      return typeof input === 'string' ? sanitizeText(input) : fallback
    case 'personal.logoName':
      return typeof input === 'string' && input.length > 0 ? input.slice(0, 200) : null
    default:
      // printer and material are checked against the technology below
      return typeof input === 'string' ? input : fallback
  }
}

/**
 * Turn any input (saved file, share link, older version) into a valid config.
 * Unknown keys are dropped, missing or invalid values fall back to the defaults,
 * numbers are clamped into their ranges, and rules between fields are applied.
 */
export function sanitizeConfig(input: unknown): DesignConfig {
  const source = isRecord(input) ? input : {}
  const out = {} as Record<Section, Record<string, unknown>>

  for (const section of Object.keys(DEFAULT_CONFIG) as Section[]) {
    const defaults = DEFAULT_CONFIG[section] as unknown as Record<string, unknown>
    const given = isRecord(source[section]) ? source[section] : {}
    out[section] = {}
    for (const key of Object.keys(defaults)) {
      out[section][key] = sanitizeField(section, key, given[key], defaults[key])
    }
  }

  const config = out as unknown as DesignConfig

  // A preset name only stands for its own dimensions
  const b = config.bottle
  if (b.preset !== 'custom') {
    const dims = BOTTLE_DIMENSIONS[b.preset]
    const matches = (Object.keys(dims) as (keyof typeof dims)[]).every((k) => b[k] === dims[k])
    if (!matches) b.preset = 'custom'
  }

  // Basic mode uses the whole shell; every texture remains available for every silhouette.
  const t = config.texture
  if (!config.mode.advanced) {
    t.zone = 'whole'
  }

  const m = config.manufacturing
  if (!PRINTERS[m.technology].includes(m.printer)) m.printer = 'generic'
  if (!MATERIALS[m.technology].includes(m.material)) m.material = TECHNOLOGY_DEFAULTS[m.technology].material

  return config
}
