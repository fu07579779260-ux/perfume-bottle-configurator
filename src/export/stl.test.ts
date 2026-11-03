import { describe, expect, it } from 'vitest'
import { buildShellMesh, shellSize } from '@/geometry/shell'
import { DEFAULT_CONFIG } from '@/model/config'
import { toBinaryStl } from './stl'

function read(buffer: ArrayBuffer) {
  const view = new DataView(buffer)
  const count = view.getUint32(80, true)
  const tris: number[][] = []
  for (let t = 0; t < count; t++) {
    const row: number[] = []
    for (let k = 0; k < 12; k++) row.push(view.getFloat32(84 + t * 50 + k * 4, true))
    tris.push(row)
  }
  return { count, tris }
}

describe('toBinaryStl', () => {
  const mesh = buildShellMesh(DEFAULT_CONFIG, 48)
  const stl = toBinaryStl(mesh)
  const { count, tris } = read(stl)

  it('writes one 50-byte record per triangle after the 84-byte header', () => {
    expect(count).toBe(mesh.indices.length / 3)
    expect(stl.byteLength).toBe(84 + count * 50)
  })

  it('writes unit normals', () => {
    for (const [nx, ny, nz] of tris) expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 4)
  })

  it('stands the shell upright (Z up) with the right height', () => {
    let minZ = Infinity
    let maxZ = -Infinity
    for (const t of tris) {
      for (const z of [t[5], t[8], t[11]]) {
        minZ = Math.min(minZ, z)
        maxZ = Math.max(maxZ, z)
      }
    }
    expect(maxZ - minZ).toBeCloseTo(shellSize(DEFAULT_CONFIG).height, 3)
  })

  it('keeps the triangles facing outwards (positive volume)', () => {
    let v = 0
    for (const t of tris) {
      const [ax, ay, az, bx, by, bz, cx, cy, cz] = t.slice(3)
      v += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)
    }
    expect(v).toBeGreaterThan(0)
  })
})
