import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useState } from 'react'
import { AdditiveBlending, CanvasTexture } from 'three'
import { bottleTotalHeight } from '@/geometry/bottle'
import { capLayout } from '@/geometry/cap'
import { checkOverhang, checkWall, shellLayout, shellSize } from '@/geometry/shell'
import { fill, useT } from '@/i18n/language'
import { cn } from '@/lib/utils'
import { useDesign } from '@/model/design-context'
import { CaptureRegistrar } from './CaptureRegistrar'
import { GlassBottle } from './GlassBottle'
import { Shell } from './Shell'
import { useShellParts } from './use-shell-parts'
import { useMarks } from '@/personal/use-marks'

// Scene units are millimetres, Y up, Y = 0 at the base of the glass bottle.
// Lit like a boutique window: a dark room, a warm spot from above, a rim
// light from behind, and the bottle standing on a plinth.
const BACKDROP = '#0c0a08'
const WARM = '#ffe2b4'
const PLINTH = '#16130f'
const GOLD = '#c9a45c'
const PLINTH_HEIGHT = 8

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
 * Reflections from soft panels inside the scene, so no HDR file is downloaded
 * from a CDN (the site must also work in mainland China): a warm softbox
 * above, two tall strip lights for the long highlights on glass and metal,
 * and a dim warm surround so nothing reflects pure black.
 */
function ShowcaseLight() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#211b14']} />
      <Lightformer form="rect" intensity={3} color={WARM} position={[0, 6, 2]} scale={[8, 3, 1]} rotation-x={-1.1} />
      <Lightformer form="rect" intensity={2.2} color="#fff1dc" position={[-5, 1, 3]} scale={[1.2, 9, 1]} rotation-y={Math.PI / 3} />
      <Lightformer form="rect" intensity={1.4} color="#ffd9a3" position={[5, 1, 3]} scale={[1.2, 9, 1]} rotation-y={-Math.PI / 3} />
      <Lightformer form="ring" intensity={1.2} color={GOLD} position={[0, 2, -7]} scale={5} />
    </Environment>
  )
}

/** A soft round pool of warm light, as a texture for the top of the plinth. */
function useLightPool() {
  return useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255, 226, 180, 0.55)')
    g.addColorStop(0.45, 'rgba(255, 210, 150, 0.18)')
    g.addColorStop(1, 'rgba(255, 210, 150, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    return new CanvasTexture(canvas)
  }, [])
}

/** A dark display plinth with a fine gold edge, its top at `top`. */
function Plinth({ top, radius }: { top: number; radius: number }) {
  const pool = useLightPool()
  return (
    <group position={[0, top, 0]}>
      <mesh position={[0, -PLINTH_HEIGHT / 2, 0]} receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.02, PLINTH_HEIGHT, 96]} />
        <meshStandardMaterial color={PLINTH} roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[radius, 0.45, 12, 128]} />
        <meshStandardMaterial color={GOLD} roughness={0.25} metalness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
        <circleGeometry args={[radius * 0.95, 96]} />
        <meshBasicMaterial map={pool} transparent blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

export default function Viewport() {
  const t = useT()
  const { config } = useDesign()
  const { bottle } = config
  const [seeThrough, setSeeThrough] = useState(false)

  const marks = useMarks(config)
  const { parts, cutting } = useShellParts(config, marks)
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
  const plinthRadius = bottle.bodyDiameter * 1.3 + 14
  const mm = (v: number) => v.toFixed(1)

  return (
    <div className="relative h-full min-h-80 overflow-hidden rounded-xl bg-[#0c0a08] ring-1 ring-rule">
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: DIRECTION.map((c) => c * distance) as [number, number, number], fov: 30, near: 1, far: 5000 }}
        fallback={<p className="p-4 text-sm text-muted">{t('viewport.noWebgl')}</p>}
      >
        <color attach="background" args={[BACKDROP]} />
        <fog attach="fog" args={[BACKDROP, height * 3, height * 7]} />
        <ambientLight intensity={0.12} />
        {/* The window spot from above, and a warm rim light from behind */}
        <spotLight position={[0, height * 3.2, height * 1.2]} angle={0.42} penumbra={0.85} intensity={2.4} decay={0} color={WARM} />
        <directionalLight position={[-height, height * 0.8, -height * 1.5]} intensity={0.9} color="#ffcf8f" />
        <ShowcaseLight />
        <Plinth top={bottomY} radius={plinthRadius} />

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
          position={[0, bottomY + 0.08, 0]}
          scale={plinthRadius * 2}
          far={height * 0.6}
          blur={2.4}
          opacity={0.7}
          color="#000000"
          frames={1}
          key={`shadow:${homeKey}`}
        />

        <CameraHome homeKey={homeKey} distance={distance} targetY={targetY} />
        <CaptureRegistrar />
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
        className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] space-y-1 rounded-lg bg-surface/85 px-3 py-2 text-xs tabular-nums backdrop-blur-sm"
      >
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-muted">{t('viewport.shell')}</dt>
          <dd className="text-ink">
            {mm(size.width)} × {mm(size.depth)} × {mm(size.height)} mm
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-muted">{t('viewport.wall')}</dt>
          <dd className={cn(wall.ok ? 'text-ink' : 'font-semibold text-warn')}>
            {mm(wall.minWall)} mm{' '}
            {wall.ok
              ? fill(t('viewport.wallOk'), { min: mm(wall.required) })
              : fill(t('viewport.wallThin'), { min: mm(wall.required) })}
          </dd>
        </div>
        {!overhang.ok && overhang.limit !== null && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-muted">{t('viewport.overhang')}</dt>
            <dd className="font-semibold text-warn">
              {fill(t('viewport.overhangSteep'), { angle: String(overhang.maxAngle), limit: String(overhang.limit) })}
            </dd>
          </div>
        )}
      </dl>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <p className="text-xs text-muted">
          {t('viewport.hint')}
          {cutting && <span className="ml-2 text-gold">· {t('viewport.cutting')}</span>}
        </p>
        <button
          type="button"
          aria-pressed={seeThrough}
          onClick={() => setSeeThrough((v) => !v)}
          className={cn(
            'pointer-events-auto shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium shadow-sm transition-colors',
            seeThrough ? 'bg-gold text-canvas' : 'bg-surface text-ink hover:bg-soft',
          )}
        >
          {t('viewport.seeThrough')}
        </button>
      </div>
    </div>
  )
}
