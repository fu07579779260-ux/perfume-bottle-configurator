import type { Manifold, ManifoldToplevel } from 'manifold-3d'
import type { MeshData } from './mesh'

/** Plain mesh → manifold solid. Caller deletes the result. */
export function toManifold(wasm: ManifoldToplevel, data: MeshData): Manifold {
  const mesh = new wasm.Mesh({ numProp: 3, vertProperties: data.positions, triVerts: data.indices })
  mesh.merge()
  return new wasm.Manifold(mesh)
}

/** Manifold solid → plain mesh (positions only). */
export function fromManifold(m: Manifold): MeshData {
  const mesh = m.getMesh()
  const n = mesh.vertProperties.length / mesh.numProp
  const positions = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) positions[i * 3 + k] = mesh.vertProperties[i * mesh.numProp + k]
  }
  return { positions, indices: new Uint32Array(mesh.triVerts) }
}
