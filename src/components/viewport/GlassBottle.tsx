import { MeshTransmissionMaterial } from '@react-three/drei'
import { useMemo } from 'react'
import { LatheGeometry, Vector2 } from 'three'
import { glassProfile, liquidProfile, pumpLayout, type ProfilePoint2 } from '@/geometry/bottle'
import type { BottleConfig } from '@/model/config'

const SEGMENTS = 96

function useLathe(profile: ProfilePoint2[]) {
  const geometry = useMemo(
    () => new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), SEGMENTS),
    [profile],
  )
  return geometry
}

/** The standard glass inner bottle with its perfume and spray pump. Y = 0 is its base. */
export function GlassBottle({ bottle, liquidColour }: { bottle: BottleConfig; liquidColour: string }) {
  const glass = useLathe(useMemo(() => glassProfile(bottle), [bottle]))
  const liquid = useLathe(useMemo(() => liquidProfile(bottle), [bottle]))
  const pump = useMemo(() => pumpLayout(bottle), [bottle])

  return (
    <group>
      {/* Drawn first and inside the glass, so the glass refracts it */}
      <mesh geometry={liquid}>
        <meshPhysicalMaterial
          color={liquidColour}
          roughness={0.15}
          transmission={0.55}
          thickness={8}
          ior={1.36}
          attenuationColor={liquidColour}
          attenuationDistance={18}
        />
      </mesh>

      <mesh geometry={glass} castShadow>
        <MeshTransmissionMaterial
          transmission={1}
          thickness={3}
          roughness={0.03}
          ior={1.5}
          chromaticAberration={0.04}
          anisotropicBlur={0.05}
          backside
          backsideThickness={2}
          samples={6}
          resolution={768}
          color="#f4fbf9"
        />
      </mesh>

      {/* Spray pump: metal collar, short stem and push button */}
      <group>
        <mesh position={[0, pump.collar.bottom + pump.collar.height / 2, 0]}>
          <cylinderGeometry args={[pump.collar.radius, pump.collar.radius, pump.collar.height, 48]} />
          <meshStandardMaterial color="#d9dcdc" metalness={1} roughness={0.22} />
        </mesh>
        <mesh position={[0, pump.collar.bottom + pump.collar.height + 0.75, 0]}>
          <cylinderGeometry args={[1.6, 1.6, 1.5, 16]} />
          <meshStandardMaterial color="#c8cccc" metalness={1} roughness={0.3} />
        </mesh>
        <mesh position={[0, pump.actuator.bottom + pump.actuator.height / 2, 0]}>
          <cylinderGeometry args={[pump.actuator.radius, pump.actuator.radius, pump.actuator.height, 48]} />
          <meshStandardMaterial color="#e3e6e6" metalness={1} roughness={0.18} />
        </mesh>
      </group>
    </group>
  )
}
