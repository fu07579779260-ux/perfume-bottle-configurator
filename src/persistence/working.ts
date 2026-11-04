import { useSyncExternalStore } from 'react'
import type { DesignConfig } from '@/model/config'
import { sanitizeConfig } from '@/model/sanitize'

// The design being worked on is kept in this browser between visits
// (localStorage), together with which saved design it belongs to, if any.

const CURRENT = 'perfume.current'
const OPEN = 'perfume.open'

export function loadWorkingDesign(): DesignConfig | null {
  try {
    const raw = localStorage.getItem(CURRENT)
    return raw ? sanitizeConfig(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveWorkingDesign(config: DesignConfig) {
  try {
    localStorage.setItem(CURRENT, JSON.stringify(config))
  } catch {
    // Storage full or blocked: the design still works for this visit
  }
}

/** The saved design and version the configurator is editing, or null for a new design. */
export interface OpenDesign {
  id: string
  n: number
}

let open: OpenDesign | null = (() => {
  try {
    const raw = localStorage.getItem(OPEN)
    return raw ? (JSON.parse(raw) as OpenDesign) : null
  } catch {
    return null
  }
})()
const listeners = new Set<() => void>()

export const openDesign = {
  get: () => open,
  set(next: OpenDesign | null) {
    open = next
    try {
      if (next) localStorage.setItem(OPEN, JSON.stringify(next))
      else localStorage.removeItem(OPEN)
    } catch {
      // Not remembered; fine for this visit
    }
    listeners.forEach((l) => l())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export const useOpenDesign = () => useSyncExternalStore(openDesign.subscribe, openDesign.get)
