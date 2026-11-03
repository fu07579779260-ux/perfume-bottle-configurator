import {
  BOTTLE_DIMENSIONS,
  RECOMMENDED_ASSEMBLY,
  TECHNOLOGY_DEFAULTS,
  type AssemblyMethod,
  type BaseFixing,
  type BottlePreset,
  type CapFit,
  type CapForm,
  type Finish,
  type HalfJoint,
  type LogoPosition,
  type NeckFinish,
  type SculpturalStyle,
  type Silhouette,
  type Technology,
  type TextMode,
  type TextPosition,
  type Texture,
  type TextureZone,
  type WaveDirection,
  type WindowShape,
} from './options'

// Lengths in mm, angles in degrees. Shell sizes are stored relative to the
// glass bottle (e.g. "+12 mm wider than the bottle"), so their ranges never
// depend on which bottle is chosen.

export interface BottleConfig {
  preset: BottlePreset
  bodyDiameter: number
  /** Base to shoulder */
  bodyHeight: number
  shoulderRadius: number
  neckFinish: NeckFinish
  neckHeight: number
  collarDiameter: number
  /** Above the neck, including the actuator */
  pumpHeight: number
}

export interface AssemblyConfig {
  method: AssemblyMethod
  baseFixing: BaseFixing
  halfJoint: HalfJoint
  magnetDiameter: number
  magnetHeight: number
  /** Gap between the shell and the glass, per side */
  clearance: number
  frictionRibs: number
}

/** One point of the side profile: t = 0 (base) … 1 (shoulder top), w = 0 … 1 of the widest allowed radius. */
export type ProfilePoint = readonly [t: number, w: number]

export interface ShapeConfig {
  silhouette: Silhouette
  /** Shell height = bottle height + this */
  heightExtra: number
  /** % of the shell height */
  shoulderHeight: number
  /** Shoulder width = bottle diameter + this */
  shoulderExtra: number
  /** Base width = bottle diameter + this */
  baseExtra: number
  cornerRadius: number
  /** Depth / width of the cross-section (Column, Pebble) */
  sectionRatio: number
  prismSides: number
  prismTwist: number
  strutCount: number
  strutWidth: number
  holeDensity: number
  grooveDepth: number
  growthSeed: number
  /** Advanced mode only; null = use the silhouette's own profile */
  profilePoints: ProfilePoint[] | null
}

export interface TextureConfig {
  type: Texture
  fluteCount: number
  fluteDepth: number
  facetCount: number
  waveDirection: WaveDirection
  waveLength: number
  waveAmplitude: number
  cellSize: number
  cellRim: number
  /** Advanced mode only */
  zone: TextureZone
  /** % of the shell height */
  zoneSplit: number
  /** Texture of the upper band when zone = 'bands' (`type` is the lower one) */
  upperType: Texture
  windowCount: number
  windowShape: WindowShape
  windowWidth: number
  windowHeight: number
}

export interface CapConfig {
  form: CapForm
  sculpturalStyle: SculpturalStyle
  height: number
  /** % of the shoulder width */
  width: number
  fit: CapFit
  clearance: number
}

export interface PersonalConfig {
  /** Up to MAX_TEXT_LINES lines, separated by "\n" */
  text: string
  textMode: TextMode
  textSize: number
  textDepth: number
  textPosition: TextPosition
  /** File name of an uploaded logo; the outlines themselves are kept outside the config */
  logoName: string | null
  logoSize: number
  logoPosition: LogoPosition
  designNumber: boolean
  shellColour: string
  capColour: string
  finish: Finish
  liquidColour: string
}

export interface ManufacturingConfig {
  technology: Technology
  printer: string
  material: string
}

export interface ModeConfig {
  /** Unlocks profile control points, free texture combinations and texture zones */
  advanced: boolean
}

export interface DesignConfig {
  bottle: BottleConfig
  assembly: AssemblyConfig
  shape: ShapeConfig
  texture: TextureConfig
  cap: CapConfig
  personal: PersonalConfig
  manufacturing: ManufacturingConfig
  mode: ModeConfig
}

export type Section = keyof DesignConfig

export interface NumberRange {
  min: number
  max: number
  step: number
  unit: 'mm' | 'deg' | '%' | 'count' | 'ratio' | 'seed'
}

type NumericKeys<T> = { [K in keyof T]: T[K] extends number ? K : never }[keyof T]

/**
 * Allowed range of every numeric parameter (PLAN.md §4). Minimums that depend
 * on the print technology (wall, strut, rim) are checked by validation on top.
 */
export const RANGES: { [S in Section]: Record<NumericKeys<DesignConfig[S]>, NumberRange> } = {
  bottle: {
    bodyDiameter: { min: 15, max: 60, step: 0.5, unit: 'mm' },
    bodyHeight: { min: 40, max: 150, step: 0.5, unit: 'mm' },
    shoulderRadius: { min: 0, max: 10, step: 0.5, unit: 'mm' },
    neckHeight: { min: 5, max: 20, step: 0.5, unit: 'mm' },
    collarDiameter: { min: 10, max: 30, step: 0.5, unit: 'mm' },
    pumpHeight: { min: 10, max: 40, step: 0.5, unit: 'mm' },
  },
  assembly: {
    magnetDiameter: { min: 3, max: 8, step: 0.5, unit: 'mm' },
    magnetHeight: { min: 1, max: 3, step: 0.5, unit: 'mm' },
    clearance: { min: 0.2, max: 0.6, step: 0.05, unit: 'mm' },
    frictionRibs: { min: 0, max: 6, step: 1, unit: 'count' },
  },
  shape: {
    heightExtra: { min: 5, max: 40, step: 0.5, unit: 'mm' },
    shoulderHeight: { min: 50, max: 90, step: 1, unit: '%' },
    shoulderExtra: { min: 4, max: 40, step: 0.5, unit: 'mm' },
    baseExtra: { min: 4, max: 40, step: 0.5, unit: 'mm' },
    cornerRadius: { min: 0, max: 15, step: 0.5, unit: 'mm' },
    sectionRatio: { min: 0.5, max: 1, step: 0.01, unit: 'ratio' },
    prismSides: { min: 5, max: 12, step: 1, unit: 'count' },
    prismTwist: { min: 0, max: 90, step: 1, unit: 'deg' },
    strutCount: { min: 3, max: 12, step: 1, unit: 'count' },
    strutWidth: { min: 1.2, max: 8, step: 0.1, unit: 'mm' },
    holeDensity: { min: 0, max: 1, step: 0.01, unit: 'ratio' },
    grooveDepth: { min: 0, max: 3, step: 0.1, unit: 'mm' },
    growthSeed: { min: 0, max: 9999, step: 1, unit: 'seed' },
  },
  texture: {
    fluteCount: { min: 8, max: 48, step: 1, unit: 'count' },
    fluteDepth: { min: 0.3, max: 3, step: 0.1, unit: 'mm' },
    facetCount: { min: 6, max: 40, step: 1, unit: 'count' },
    waveLength: { min: 4, max: 30, step: 0.5, unit: 'mm' },
    waveAmplitude: { min: 0.3, max: 3, step: 0.1, unit: 'mm' },
    cellSize: { min: 6, max: 25, step: 0.5, unit: 'mm' },
    cellRim: { min: 1.2, max: 6, step: 0.1, unit: 'mm' },
    zoneSplit: { min: 20, max: 80, step: 1, unit: '%' },
    windowCount: { min: 0, max: 6, step: 1, unit: 'count' },
    windowWidth: { min: 4, max: 20, step: 0.5, unit: 'mm' },
    // The upper limit also depends on the shell height (shell height − 10); geometry clamps it
    windowHeight: { min: 10, max: 180, step: 0.5, unit: 'mm' },
  },
  cap: {
    height: { min: 15, max: 60, step: 0.5, unit: 'mm' },
    width: { min: 40, max: 110, step: 1, unit: '%' },
    clearance: { min: 0.2, max: 0.6, step: 0.05, unit: 'mm' },
  },
  personal: {
    textSize: { min: 3, max: 15, step: 0.5, unit: 'mm' },
    textDepth: { min: 0.4, max: 1.5, step: 0.05, unit: 'mm' },
    logoSize: { min: 5, max: 40, step: 0.5, unit: 'mm' },
  },
  manufacturing: {},
  mode: {},
}

export const MAX_TEXT_LINES = 2
export const MAX_TEXT_LINE_LENGTH = 12
export const PROFILE_POINTS_MIN = 4
export const PROFILE_POINTS_MAX = 10

const DEFAULT_TECHNOLOGY: Technology = 'fdm'

export const DEFAULT_CONFIG: DesignConfig = {
  bottle: { preset: '30ml', ...BOTTLE_DIMENSIONS['30ml'] },
  assembly: {
    method: RECOMMENDED_ASSEMBLY.column,
    baseFixing: 'thread',
    halfJoint: 'snaps',
    magnetDiameter: 5,
    magnetHeight: 2,
    clearance: TECHNOLOGY_DEFAULTS[DEFAULT_TECHNOLOGY].clearance,
    frictionRibs: 3,
  },
  shape: {
    silhouette: 'column',
    heightExtra: 15,
    shoulderHeight: 80,
    shoulderExtra: 12,
    baseExtra: 12,
    cornerRadius: 4,
    sectionRatio: 1,
    prismSides: 6,
    prismTwist: 0,
    strutCount: 6,
    strutWidth: 4,
    holeDensity: 0.5,
    grooveDepth: 1.2,
    growthSeed: 2024,
    profilePoints: null,
  },
  texture: {
    type: 'smooth',
    fluteCount: 24,
    fluteDepth: 1,
    facetCount: 16,
    waveDirection: 'horizontal',
    waveLength: 12,
    waveAmplitude: 1,
    cellSize: 12,
    cellRim: 2.5,
    zone: 'whole',
    zoneSplit: 50,
    upperType: 'smooth',
    windowCount: 0,
    windowShape: 'slot',
    windowWidth: 8,
    windowHeight: 40,
  },
  cap: {
    form: 'follow',
    sculpturalStyle: 'bud',
    height: 30,
    width: 70,
    fit: 'friction',
    clearance: TECHNOLOGY_DEFAULTS[DEFAULT_TECHNOLOGY].clearance,
  },
  personal: {
    text: '',
    textMode: 'engraved',
    textSize: 6,
    textDepth: 0.8,
    textPosition: 'back',
    logoName: null,
    logoSize: 15,
    logoPosition: 'capTop',
    designNumber: true,
    shellColour: '#e6d8bf',
    capColour: '#e6d8bf',
    finish: 'matte',
    liquidColour: '#f2c46d',
  },
  manufacturing: {
    technology: DEFAULT_TECHNOLOGY,
    printer: 'generic',
    material: TECHNOLOGY_DEFAULTS[DEFAULT_TECHNOLOGY].material,
  },
  mode: { advanced: false },
}
