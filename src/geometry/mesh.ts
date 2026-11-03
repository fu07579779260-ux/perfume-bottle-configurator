// Small mesh helpers shared by the shell, cap and test rings.

export interface MeshData {
  positions: Float32Array
  indices: Uint32Array
}

export interface RevolvePoint {
  r: number
  y: number
}

/**
 * Sweep a closed side profile around the Y axis into a watertight mesh with
 * outward-facing triangles. List the profile counter-clockwise in the (r, y)
 * plane (out along the bottom, up the outside, back down the inside).
 *
 * - If the first and last points lie on the axis (r = 0), they become single
 *   vertices that close the bottom and the inside floor (a cup).
 * - Otherwise the profile is a loop and the result is a ring (a tube).
 *
 * `place` turns a profile point and an angle into (x, z), e.g. to squash the
 * outer wall into an ellipse or a polygon; by default the section is round.
 * `angleAt` turns each ring by an angle (radians), e.g. for a twist.
 */
export function revolve<P extends RevolvePoint>(
  profile: P[],
  segments: number,
  place: (p: P, angle: number) => [x: number, z: number] = (p, a) => [Math.cos(a) * p.r, Math.sin(a) * p.r],
  angleAt: (p: P) => number = () => 0,
): MeshData {
  const first = profile[0]
  const last = profile[profile.length - 1]
  const capped = first.r === 0 && last.r === 0
  const rings = capped ? profile.slice(1, -1) : profile
  const positions: number[] = []
  const indices: number[] = []
  const offset = capped ? 1 : 0

  if (capped) positions.push(0, first.y, 0)
  for (const p of rings) {
    const turn = angleAt(p)
    for (let s = 0; s < segments; s++) {
      const [x, z] = place(p, turn + (s / segments) * Math.PI * 2)
      positions.push(x, p.y, z)
    }
  }
  const end = positions.length / 3
  if (capped) positions.push(0, last.y, 0)

  const ring = (i: number, s: number) => offset + (i % rings.length) * segments + (s % segments)
  const band = (i: number, j: number) => {
    for (let s = 0; s < segments; s++) {
      const a = ring(i, s)
      const b = ring(i, s + 1)
      const c = ring(j, s)
      const d = ring(j, s + 1)
      indices.push(a, c, b, b, c, d)
    }
  }

  for (let i = 0; i < rings.length - 1; i++) band(i, i + 1)
  if (capped) {
    const lastRing = rings.length - 1
    for (let s = 0; s < segments; s++) {
      indices.push(0, ring(0, s), ring(0, s + 1))
      indices.push(end, ring(lastRing, s + 1), ring(lastRing, s))
    }
  } else {
    band(rings.length - 1, 0)
  }

  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) }
}

/** Move a mesh by (x, y, z). */
export function translate(mesh: MeshData, x: number, y: number, z: number): MeshData {
  const positions = mesh.positions.slice()
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] += x
    positions[i + 1] += y
    positions[i + 2] += z
  }
  return { positions, indices: mesh.indices }
}

/** Put several separate solids into one mesh (one file). */
export function mergeMeshes(meshes: MeshData[]): MeshData {
  const vertexCount = meshes.reduce((n, m) => n + m.positions.length, 0)
  const indexCount = meshes.reduce((n, m) => n + m.indices.length, 0)
  const positions = new Float32Array(vertexCount)
  const indices = new Uint32Array(indexCount)
  let p = 0
  let i = 0
  for (const m of meshes) {
    positions.set(m.positions, p)
    const base = p / 3
    for (let k = 0; k < m.indices.length; k++) indices[i + k] = m.indices[k] + base
    p += m.positions.length
    i += m.indices.length
  }
  return { positions, indices }
}

/** Axis-aligned size of a mesh (scene axes: X width, Z depth, Y height). */
export function meshBounds(mesh: MeshData) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  const p = mesh.positions
  for (let i = 0; i < p.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], p[i + k])
      max[k] = Math.max(max[k], p[i + k])
    }
  }
  return { min, max, width: max[0] - min[0], height: max[1] - min[1], depth: max[2] - min[2] }
}
