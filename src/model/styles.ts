import type { DesignConfig, Section } from './config'
import { designReducer, type DesignAction } from './reducer'

// Style presets (PLAN.md §4.6): a starting point that sets silhouette,
// texture, cap, colours and finish together. Everything stays editable.

export const STYLES = ['minimal', 'vintage', 'natural', 'futuristic', 'luxury'] as const
export type Style = (typeof STYLES)[number]

type Patch = { [S in Section]?: Partial<DesignConfig[S]> }

const PRESETS: Record<Style, Patch> = {
  minimal: {
    shape: { silhouette: 'column', cornerRadius: 3 },
    texture: { type: 'smooth', windowCount: 0 },
    cap: { form: 'follow' },
    personal: { shellColour: '#f2efe9', capColour: '#f2efe9', finish: 'matte' },
  },
  vintage: {
    shape: { silhouette: 'teardrop' },
    texture: { type: 'fluted', fluteCount: 24, fluteDepth: 1, windowCount: 0 },
    cap: { form: 'gem', width: 70 },
    personal: { shellColour: '#d9c7a7', capColour: '#b08d57', finish: 'silk' },
  },
  natural: {
    shape: { silhouette: 'pebble' },
    texture: { type: 'waves', waveDirection: 'horizontal', waveLength: 14, waveAmplitude: 0.8, windowCount: 0 },
    cap: { form: 'sculptural', sculpturalStyle: 'organic', width: 75 },
    personal: { shellColour: '#c9b79c', capColour: '#7d8f69', finish: 'matte' },
  },
  futuristic: {
    shape: { silhouette: 'prism', prismSides: 7, prismTwist: 45 },
    texture: { type: 'smooth', windowCount: 0 },
    cap: { form: 'follow' },
    personal: { shellColour: '#2b3a42', capColour: '#c0c8cc', finish: 'metallic' },
  },
  luxury: {
    shape: { silhouette: 'exoskeleton', strutCount: 8, strutWidth: 3 },
    texture: { type: 'smooth' },
    cap: { form: 'sphere', width: 80 },
    personal: { shellColour: '#1f1d1b', capColour: '#c9a227', finish: 'metallic' },
  },
}

/** The design with a style applied: the silhouette first (it brings its own assembly), then the rest. */
export function applyStyle(config: DesignConfig, style: Style): DesignConfig {
  const preset = PRESETS[style]
  const order: Section[] = ['shape', 'texture', 'cap', 'personal']
  return order.reduce(
    (c, section) => (preset[section] ? designReducer(c, { type: 'patch', section, values: preset[section] } as DesignAction) : c),
    config,
  )
}
