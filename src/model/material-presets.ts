import type { DesignConfig } from './config'
import { designReducer } from './reducer'
import type { Finish, Technology } from './options'

export const MATERIAL_PRESETS = [
  { id: 'pla', technology: 'fdm', material: 'pla', finish: 'matte' },
  { id: 'petg', technology: 'fdm', material: 'petg', finish: 'silk' },
  { id: 'standard', technology: 'resin', material: 'standard', finish: 'translucent' },
  { id: 'tough', technology: 'resin', material: 'tough', finish: 'silk' },
  { id: 'pa12', technology: 'sls', material: 'pa12', finish: 'matte' },
] as const satisfies readonly { id: string; technology: Technology; material: string; finish: Finish }[]

export type MaterialPresetId = (typeof MATERIAL_PRESETS)[number]['id']

/** Apply technology defaults first, then the chosen grade and its suggested finish. */
export function applyMaterialPreset(config: DesignConfig, id: MaterialPresetId): DesignConfig {
  const preset = MATERIAL_PRESETS.find((p) => p.id === id)!
  let next = designReducer(config, { type: 'patch', section: 'manufacturing', values: { technology: preset.technology } })
  next = designReducer(next, { type: 'patch', section: 'manufacturing', values: { material: preset.material } })
  return designReducer(next, { type: 'patch', section: 'personal', values: { finish: preset.finish } })
}
