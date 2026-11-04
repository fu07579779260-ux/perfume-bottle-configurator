import { useEffect, useReducer, type ReactNode } from 'react'
import { loadWorkingDesign, openDesign, saveWorkingDesign } from '@/persistence/working'
import { DEFAULT_CONFIG, type DesignConfig } from './config'
import { DesignContext } from './design-context'
import { designReducer } from './reducer'
import { decodeShareParam, readShareParam } from './serialize'

/** Wait this long after the last change before saving, so sliders don't write on every step. */
const AUTOSAVE_MS = 400

/**
 * Start from a shared design when the page was opened from a share link
 * (it is someone else's design, so it isn't tied to a saved one), then from
 * the design worked on last time, then from the defaults.
 */
function initialConfig(): DesignConfig {
  const param = readShareParam(window.location.hash)
  const shared = param && decodeShareParam(param)
  if (shared) {
    openDesign.set(null)
    return shared
  }
  return loadWorkingDesign() ?? structuredClone(DEFAULT_CONFIG)
}

export function DesignProvider({ children }: { children: ReactNode }) {
  const [config, dispatch] = useReducer(designReducer, undefined, initialConfig)

  useEffect(() => {
    const timer = setTimeout(() => saveWorkingDesign(config), AUTOSAVE_MS)
    return () => clearTimeout(timer)
  }, [config])

  return <DesignContext.Provider value={{ config, dispatch }}>{children}</DesignContext.Provider>
}
