import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useState } from 'react'
import { bottleTotalHeight } from '@/geometry/bottle'
import { capLayout } from '@/geometry/cap'
import { previewParts } from '@/geometry/parts'
import { checkOverhang, checkWall, shellLayout, shellSize } from '@/geometry/shell'
import { fill, useT } from '@/i18n/language'
import { cn } from '@/lib/utils'
import { useDesign } from '@/model/design-context'
import { GlassBottle } from './GlassBottle'
import { Shell } from './Shell'

// Scene units are millimetres, Y up, Y = 0 at the base of the glass bottle.
// Colours follow the ocean theme tokens.
const BACKDROP = '#eef1ea'
const SHADOW = '#123a40'

/** A slightly raised three-quarter view; the distance scales with the bottle's height. */
const DIRECTION = (() => {
  const v = [0.55, 0.32, 1]
  const len = Math.hypot(...v)
  return v.map((c) => c / len) as [number, number, number]
})()
const DISTANCE_PER_MM = 2.6

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Moves the camera to the home view whenever `homeKey` changes. */
function CameraHome({ homeKey, distance, targetY }: { homeKey: string; distance: number; targetY: number }) {
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    const [x, y, z] = DIRECTION
    camera.position.set(x * distance, targetY + y * distance, z * distance)
    invalidate()
    // Only re-home when the bottle changes size, not on every small edit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeKey, camera, invalidate])
  return null
}

/**
 * Studio light built from soft panels inside the scene, so no HDR file is
 * downloaded from a CDN (the site must also work in mainland China).
 */
function StudioLight() {
  return (
    <Environment resolution={256} frames={1}>
      {/* Soft surround instead of black, so the metal pump reflects light */}
      <color attach="background" args={['#c9d6d2']} />
      <Lightformer form="rect" intensity={2.4} color="#ffffff" position={[0, 6, 4]} scale={[10, 4, 1]} rotation-x={-0.8} />
      <Lightformer form="rect" intensity={1.6} color="#e9f5f1" position={[-6, 1, 2]} scale={[3, 8, 1]} rotation-y={Math.PI / 2.5} />
      <Lightformer form="rect" intensity={1.2} color="#fff3e3" position={[6, 1, 1]} scale={[3, 8, 1]} rotation-y={-Math.PI / 2.5} />
      <Lightformer form="ring" intensity={0.8} color="#d5e8e2" position={[0, 2, -8]} scale={6} />
    </Environment>
  )
}

export default function Viewport() {
  const t = useT()
  const { config } = useDesign()
  const { bottle } = config
  const [seeThrough, setSeeThrough] = useState(false)

  const parts = useMemo(() => previewParts(config), [config])
  const shell = parts[0].mesh
  const { bottomY } = shellLayout(config)
  const size = shellSize(config, shell)
  const wall = checkWall(config)
  const overhang = checkOverhang(config)

  // Frame the glass bottle with its pump; the shell's own edits don't move the camera
  const height = Math.max(bottleTotalHeight(bottle), capLayout(config).topY)
  const distance = height * DISTANCE_PER_MM
  const targetY = height * 0.46
  const homeKey = `${bottle.bodyDiameter}:${height}`
  const mm = (v: number) => v.toFixed(1)

  return (
    <div className="relative h-full min-h-80 overflow-hidden rounded-xl bg-[#eef1ea] shadow-[0_1px_0_var(--rule)]">
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: DIRECTION.map((c) => c * distance) as [number, number, number], fov: 30, near: 1, far: 5000 }}
        fallback={<p className="p-4 text-sm text-tide">{t('viewport.noWebgl')}</p>}
      >
        <color attach="background" args={[BACKDROP]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[60, 120, 80]} intensity={1.2} />
        <StudioLight />

        <GlassBottle bottle={bottle} liquidColour={config.personal.liquidColour} />
        {parts.map((part) => (
          <Shell
            key={part.id}
            mesh={part.mesh}
            colour={part.id === 'cap' ? config.personal.capColour : config.personal.shellColour}
            finish={config.personal.finish}
            seeThrough={seeThrough}
          />
        ))}
        <ContactShadows
          position={[0, bottomY - 0.01, 0]}
          scale={bottle.bodyDiameter * 4}
          far={height * 0.6}
          blur={2.4}
          opacity={0.35}
          color={SHADOW}
          frames={1}
          key={`shadow:${homeKey}`}
        />

        <CameraHome homeKey={homeKey} distance={distance} targetY={targetY} />
        <OrbitControls
          key={homeKey}
          makeDefault
          enableDamping={!reducedMotion()}
          enablePan={false}
          target={[0, targetY, 0]}
          minDistance={height * 0.8}
          maxDistance={height * 5}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI / 2 + 0.05}
        />
      </Canvas>

      {/* role=status: screen readers hear the new size and wall check after each change */}
      <dl
        role="status"
        className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] space-y-1 rounded-lg bg-shell/85 px-3 py-2 text-xs tabular-nums backdrop-blur-sm"
      >
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-tide">{t('viewport.shell')}</dt>
          <dd className="text-deep">
            {mm(size.width)} × {mm(size.depth)} × {mm(size.height)} mm
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-tide">{t('viewport.wall')}</dt>
          <dd className={cn(wall.ok ? 'text-deep' : 'font-semibold text-coral-ink')}>
            {mm(wall.minWall)} mm{' '}
            {wall.ok
              ? fill(t('viewport.wallOk'), { min: mm(wall.required) })
              : fill(t('viewport.wallThin'), { min: mm(wall.required) })}
          </dd>
        </div>
        {!overhang.ok && overhang.limit !== null && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-tide">{t('viewport.overhang')}</dt>
            <dd className="font-semibold text-coral-ink">
              {fill(t('viewport.overhangSteep'), { angle: String(overhang.maxAngle), limit: String(overhang.limit) })}
            </dd>
          </div>
        )}
      </dl>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <p className="text-xs text-tide">{t('viewport.hint')}</p>
        <button
          type="button"
          aria-pressed={seeThrough}
          onClick={() => setSeeThrough((v) => !v)}
          className={cn(
            'pointer-events-auto shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium shadow-sm transition-colors',
            seeThrough ? 'bg-deep text-sand' : 'bg-shell text-deep hover:bg-foam',
          )}
        >
          {t('viewport.seeThrough')}
        </button>
      </div>
    </div>
  )
}
