import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, DataTexture, LinearFilter, RepeatWrapping } from 'three'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { MeshData } from '@/geometry/mesh'
import type { Finish } from '@/model/options'

/** Normals stay smooth across gentle curves but break at the rim and the floor. */
const CREASE = (40 * Math.PI) / 180

const FINISH: Record<Finish, { roughness: number; metalness: number; clearcoat: number; transmission: number }> = {
  matte: { roughness: 0.8, metalness: 0, clearcoat: 0, transmission: 0 },
  silk: { roughness: 0.18, metalness: 0, clearcoat: 0.85, transmission: 0 },
  translucent: { roughness: 0.14, metalness: 0, clearcoat: 0.45, transmission: 0.8 },
  metallic: { roughness: 0.2, metalness: 1, clearcoat: 0.3, transmission: 0 },
}

/** Small, deterministic material grain; it never changes the printable geometry. */
function materialGrain() {
  const pixels = new Uint8Array(64 * 64 * 4)
  let seed = 7919
  for (let i = 0; i < pixels.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const grey = 96 + (seed % 64)
    pixels[i] = pixels[i + 1] = pixels[i + 2] = grey
    pixels[i + 3] = 255
  }
  const texture = new DataTexture(pixels, 64, 64)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.magFilter = texture.minFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

export function Shell({ mesh, colour, finish, material, seeThrough }: {
  mesh: MeshData
  colour: string
  finish: Finish
  material: string
  /** Ghost the shell so the glass bottle inside can be seen */
  seeThrough: boolean
}) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(mesh.positions, 3))
    g.setIndex(new BufferAttribute(mesh.indices, 1))
    const smooth = toCreasedNormals(g, CREASE)
    if (smooth !== g) g.dispose()
    const position = smooth.getAttribute('position')
    const uv = new Float32Array(position.count * 2)
    for (let i = 0; i < position.count; i++) {
      uv[i * 2] = (Math.atan2(position.getZ(i), position.getX(i)) / (Math.PI * 2)) * 16
      uv[i * 2 + 1] = position.getY(i) / 4
    }
    smooth.setAttribute('uv', new BufferAttribute(uv, 2))
    return smooth
  }, [mesh])
  useEffect(() => () => geometry.dispose(), [geometry])
  const grain = useMemo(materialGrain, [])
  useEffect(() => () => grain.dispose(), [grain])

  const f = FINISH[finish]

  return (
    <mesh geometry={geometry} castShadow renderOrder={seeThrough ? 2 : 0}>
      <meshPhysicalMaterial
        color={colour}
        roughness={material === 'pa12' && finish === 'matte' ? 0.95 : f.roughness}
        metalness={f.metalness}
        clearcoat={f.clearcoat}
        clearcoatRoughness={0.1}
        envMapIntensity={finish === 'metallic' ? 1.5 : 1.1}
        bumpMap={finish === 'matte' ? grain : null}
        bumpScale={material === 'pa12' ? 0.06 : 0.015}
        transmission={seeThrough ? 0 : f.transmission}
        ior={1.48}
        attenuationColor={colour}
        attenuationDistance={80}
        thickness={2}
        transparent={seeThrough}
        opacity={seeThrough ? 0.28 : 1}
        depthWrite={!seeThrough}
      />
    </mesh>
  )
}
