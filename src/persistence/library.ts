import { del, get, set } from 'idb-keyval'
import { useEffect, useSyncExternalStore } from 'react'
import { createDesignLibrary, type SavedDesign } from './designs'

/** The design library of this browser, in IndexedDB. */
export const library = createDesignLibrary({
  get: (key) => get(key),
  set: (key, value) => set(key, value),
  del: (key) => del(key),
})

/** All saved designs, newest first; loads them on first use. */
export function useSavedDesigns(): SavedDesign[] {
  useEffect(() => {
    void library.load().catch((error) => console.error('Could not read saved designs', error))
  }, [])
  return useSyncExternalStore(library.subscribe, library.snapshot)
}
