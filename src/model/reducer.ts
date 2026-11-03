import { DEFAULT_CONFIG, type DesignConfig, type Section } from './config'
import { BOTTLE_DIMENSIONS, RECOMMENDED_ASSEMBLY, TECHNOLOGY_DEFAULTS } from './options'
import { sanitizeConfig } from './sanitize'

export type DesignAction =
  | { [S in Section]: { type: 'patch'; section: S; values: Partial<DesignConfig[S]> } }[Section]
  | { type: 'load'; config: unknown }
  | { type: 'reset' }

export function designReducer(state: DesignConfig, action: DesignAction): DesignConfig {
  switch (action.type) {
    case 'reset':
      return structuredClone(DEFAULT_CONFIG)

    case 'load':
      return sanitizeConfig(action.config)

    case 'patch': {
      const next = {
        ...state,
        [action.section]: { ...state[action.section], ...action.values },
      } as DesignConfig

      // Choosing a bottle preset fills in its dimensions; editing a dimension
      // afterwards turns the preset into "custom" (in sanitizeConfig)
      const preset = next.bottle.preset
      if (preset !== state.bottle.preset && preset !== 'custom') {
        next.bottle = { ...next.bottle, ...BOTTLE_DIMENSIONS[preset] }
      }

      // A new silhouette brings its recommended assembly method (PLAN.md §4.2)
      const silhouette = next.shape.silhouette
      if (silhouette !== state.shape.silhouette) {
        next.assembly = { ...next.assembly, method: RECOMMENDED_ASSEMBLY[silhouette] }
      }

      // A new technology brings its own clearances, material and printer (PLAN.md §5)
      const tech = next.manufacturing.technology
      if (tech !== state.manufacturing.technology) {
        const d = TECHNOLOGY_DEFAULTS[tech]
        next.assembly = { ...next.assembly, clearance: d.clearance }
        next.cap = { ...next.cap, clearance: d.clearance }
        next.manufacturing = { ...next.manufacturing, material: d.material, printer: 'generic' }
      }

      return sanitizeConfig(next)
    }
  }
}
