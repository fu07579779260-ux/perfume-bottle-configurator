import type { Outline } from '@/geometry/trace'
import type { DesignConfig } from '@/model/config'
import { sanitizeConfig } from '@/model/sanitize'

// "My designs" (PLAN.md §7): saved designs with numbered versions, a note and
// photos per version, kept in this browser only (IndexedDB). Nothing is
// uploaded. The storage is passed in, so the logic can be tested without a
// browser.

export interface FitFeedback {
  shell: 'tight' | 'good' | 'loose'
  cap: 'falls' | 'good' | 'stuck'
}

export interface DesignVersion {
  n: number
  savedAt: string
  config: DesignConfig
  /** Small JPEG of the 3D view, as a data URL */
  thumbnail: string | null
  note: string
  /** Ids of photos stored next to the designs */
  photos: string[]
  /** The uploaded logo, so it comes back with the design */
  logo: { name: string; outline: Outline } | null
  /** Filled in after a test print (build step 21) */
  feedback: FitFeedback | null
}

export interface SavedDesign {
  id: string
  name: string
  createdAt: string
  versions: DesignVersion[]
}

export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
  del(key: string): Promise<void>
}

const INDEX = 'designs'
const photoKey = (id: string) => `photo:${id}`

const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export function createDesignLibrary(store: KeyValueStore) {
  let cache: SavedDesign[] | null = null
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())

  async function load(): Promise<SavedDesign[]> {
    if (cache) return cache
    const raw = (await store.get<SavedDesign[]>(INDEX)) ?? []
    // Older or edited entries are made valid again
    cache = raw.map((d) => ({ ...d, versions: d.versions.map((v) => ({ ...v, config: sanitizeConfig(v.config) })) }))
    // Pages that rendered before the first read show the designs now
    emit()
    return cache
  }

  async function write(next: SavedDesign[]) {
    cache = next
    await store.set(INDEX, next)
    emit()
  }

  const version = (n: number, config: DesignConfig, extra: Partial<DesignVersion>): DesignVersion => ({
    n,
    savedAt: new Date().toISOString(),
    config: structuredClone(config),
    thumbnail: null,
    note: '',
    photos: [],
    logo: null,
    feedback: null,
    ...extra,
  })

  return {
    load,
    /** Synchronous snapshot for React (empty until the first load) */
    snapshot: () => cache ?? EMPTY,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    async saveNew(name: string, config: DesignConfig, extra: Partial<DesignVersion> = {}): Promise<{ id: string; n: number }> {
      const list = await load()
      const design: SavedDesign = { id: newId(), name: name.trim() || 'Untitled', createdAt: new Date().toISOString(), versions: [version(1, config, extra)] }
      await write([design, ...list])
      return { id: design.id, n: 1 }
    },

    async saveVersion(id: string, config: DesignConfig, extra: Partial<DesignVersion> = {}): Promise<{ id: string; n: number } | null> {
      const list = await load()
      const design = list.find((d) => d.id === id)
      if (!design) return null
      const n = Math.max(...design.versions.map((v) => v.n)) + 1
      // The newest design moves to the top of the list
      await write([{ ...design, versions: [...design.versions, version(n, config, extra)] }, ...list.filter((d) => d.id !== id)])
      return { id, n }
    },

    async rename(id: string, name: string) {
      const list = await load()
      await write(list.map((d) => (d.id === id ? { ...d, name: name.trim() || d.name } : d)))
    },

    async updateVersion(id: string, n: number, change: Partial<Pick<DesignVersion, 'note' | 'feedback'>>) {
      const list = await load()
      await write(list.map((d) => (d.id === id ? { ...d, versions: d.versions.map((v) => (v.n === n ? { ...v, ...change } : v)) } : d)))
    },

    async duplicate(id: string, copyName: (name: string) => string): Promise<string | null> {
      const list = await load()
      const design = list.find((d) => d.id === id)
      if (!design) return null
      const latest = design.versions[design.versions.length - 1]
      const copy: SavedDesign = { id: newId(), name: copyName(design.name), createdAt: new Date().toISOString(), versions: [{ ...latest, n: 1, photos: [] }] }
      await write([copy, ...list])
      return copy.id
    },

    async remove(id: string) {
      const list = await load()
      const design = list.find((d) => d.id === id)
      for (const v of design?.versions ?? []) for (const p of v.photos) await store.del(photoKey(p))
      await write(list.filter((d) => d.id !== id))
    },

    async addPhoto(id: string, n: number, photo: Blob): Promise<string> {
      const photoId = newId()
      await store.set(photoKey(photoId), photo)
      const list = await load()
      await write(list.map((d) => (d.id === id ? { ...d, versions: d.versions.map((v) => (v.n === n ? { ...v, photos: [...v.photos, photoId] } : v)) } : d)))
      return photoId
    },

    async removePhoto(id: string, n: number, photoId: string) {
      await store.del(photoKey(photoId))
      const list = await load()
      await write(list.map((d) => (d.id === id ? { ...d, versions: d.versions.map((v) => (v.n === n ? { ...v, photos: v.photos.filter((p) => p !== photoId) } : v)) } : d)))
    },

    getPhoto: (photoId: string) => store.get<Blob>(photoKey(photoId)),
  }
}

const EMPTY: SavedDesign[] = []

export type DesignLibrary = ReturnType<typeof createDesignLibrary>
