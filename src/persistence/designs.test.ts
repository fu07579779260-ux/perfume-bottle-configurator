import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '@/model/config'
import { designReducer } from '@/model/reducer'
import { createDesignLibrary, type KeyValueStore } from './designs'

function memoryStore(): KeyValueStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>()
  return {
    data,
    get: async (k) => structuredClone(data.get(k)) as never,
    set: async (k, v) => void data.set(k, structuredClone(v)),
    del: async (k) => void data.delete(k),
  }
}

describe('design library', () => {
  it('saves a design, then new versions numbered 1, 2, 3', async () => {
    const lib = createDesignLibrary(memoryStore())
    const { id } = await lib.saveNew('Sea glass', DEFAULT_CONFIG)
    const taller = designReducer(structuredClone(DEFAULT_CONFIG), { type: 'patch', section: 'shape', values: { heightExtra: 25 } })
    expect(await lib.saveVersion(id, taller)).toEqual({ id, n: 2 })
    await lib.saveVersion(id, taller)
    const [d] = await lib.load()
    expect(d.name).toBe('Sea glass')
    expect(d.versions.map((v) => v.n)).toEqual([1, 2, 3])
    expect(d.versions[1].config.shape.heightExtra).toBe(25)
  })

  it('keeps designs in storage between visits', async () => {
    const store = memoryStore()
    await createDesignLibrary(store).saveNew('Kept', DEFAULT_CONFIG)
    const again = createDesignLibrary(store)
    expect((await again.load())[0].name).toBe('Kept')
  })

  it('makes stored designs valid again when they are read back', async () => {
    const store = memoryStore()
    await store.set('designs', [{ id: 'x', name: 'Old', createdAt: '', versions: [{ n: 1, config: { shape: { heightExtra: 999 } }, note: '', photos: [] }] }])
    const [d] = await createDesignLibrary(store).load()
    expect(d.versions[0].config.shape.heightExtra).toBe(40)
  })

  it('adds notes and photos to a version, and deletes photos with the design', async () => {
    const store = memoryStore()
    const lib = createDesignLibrary(store)
    const { id } = await lib.saveNew('Notes', DEFAULT_CONFIG)
    await lib.updateVersion(id, 1, { note: 'Slightly loose on the glass' })
    const photo = await lib.addPhoto(id, 1, new Blob(['jpeg']))
    let [d] = await lib.load()
    expect(d.versions[0].note).toBe('Slightly loose on the glass')
    expect(d.versions[0].photos).toEqual([photo])
    expect(await lib.getPhoto(photo)).toBeDefined()
    await lib.remove(id)
    ;[d] = await lib.load()
    expect(d).toBeUndefined()
    expect(store.data.has(`photo:${photo}`)).toBe(false)
  })

  it('duplicates the latest version as a new design', async () => {
    const lib = createDesignLibrary(memoryStore())
    const { id } = await lib.saveNew('Base', DEFAULT_CONFIG)
    await lib.saveVersion(id, DEFAULT_CONFIG)
    const copy = await lib.duplicate(id, (n) => `${n} (copy)`)
    const list = await lib.load()
    expect(list[0].id).toBe(copy)
    expect(list[0].name).toBe('Base (copy)')
    expect(list[0].versions).toHaveLength(1)
  })
})

describe('design library listeners', () => {
  it('tells listeners when the designs have been read for the first time', async () => {
    const store = memoryStore()
    await createDesignLibrary(store).saveNew('Read later', DEFAULT_CONFIG)
    const lib = createDesignLibrary(store)
    let calls = 0
    lib.subscribe(() => calls++)
    expect(lib.snapshot()).toEqual([])
    await lib.load()
    expect(calls).toBe(1)
    expect(lib.snapshot()[0].name).toBe('Read later')
  })
})
