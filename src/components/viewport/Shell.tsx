import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { MeshData } from '@/geometry/mesh'
import type { Finish } from '@/model/options'

/** Normals stay smooth across gentle curves but break at the rim and the floor. */
const CREASE = (40 * Math.PI) / 180

const FINISH: Record<Finish, { roughness: number; metalness: number; clearcoat: number; transmission: number }> = {
  matte: { roughness: 0.85, metalness: 0, clearcoat: 0, transmission: 0 },
  silk: { roughness: 0.42, metalness: 0, clearcoat: 0.35, transmission: 0 },
  translucent: { roughness: 0.35, metalness: 0, clearcoat: 0.2, transmission: 0.55 },
  metallic: { roughness: 0.3, metalness: 0.85, clearcoat: 0.2, transmission: 0 },
}

export function Shell({ mesh, colour, finish, seeThrough }: {
  mesh: MeshData
  colour: string
  finish: Finish
  /** Ghost the shell so the glass bottle inside can be seen */
  seeThrough: boolean
}) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(mesh.positions, 3))
    g.setIndex(new BufferAttribute(mesh.indices, 1))
    return toCreasedNormals(g, CREASE)
  }, [mesh])
  useEffect(() => () => geometry.dispose(), [geometry])

  const f = FINISH[finish]

  return (
    <mesh geometry={geometry} castShadow renderOrder={seeThrough ? 2 : 0}>
      <meshPhysicalMaterial
        color={colour}
        roughness={f.roughness}
        metalness={f.metalness}
        clearcoat={f.clearcoat}
        transmission={seeThrough ? 0 : f.transmission}
        thickness={2}
        transparent={seeThrough}
        opacity={seeThrough ? 0.28 : 1}
        depthWrite={!seeThrough}
      />
    </mesh>
  )
}
