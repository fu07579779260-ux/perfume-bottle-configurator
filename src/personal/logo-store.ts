import { useSyncExternalStore } from 'react'
import type { Outline } from '@/geometry/trace'

// The uploaded logo's traced outline. The design only keeps the file name;
// the outline lives here for this visit (saving it with the design comes
// with "My designs" in build step 20).

export interface StoredLogo {
  name: string
  outline: Outline
}

let current: StoredLogo | null = null
const listeners = new Set<() => void>()

export const logoStore = {
  get: () => current,
  set(next: StoredLogo | null) {
    current = next
    listeners.forEach((l) => l())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useLogo(): StoredLogo | null {
  return useSyncExternalStore(logoStore.subscribe, logoStore.get)
}
